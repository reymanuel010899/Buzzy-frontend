import { useState, useRef, useCallback, useEffect } from 'react'
import { Howl, Howler } from 'howler'

// On mobile, AudioContext starts suspended until a user gesture.
// Resume it on first user interaction so Howl can play immediately on tap.
function ensureAudioContextResumed() {
  const ctx = Howler.ctx as AudioContext | undefined
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

export interface MusicTrack {
  id: string
  title: string
  artist: string
  duration: string
  durationSecs: number
  cover: string
  audio_url: string
  category: 'trending' | 'pop' | 'urban' | 'electronic' | 'latin' | 'chill'
  isFavorite?: boolean
}

export interface AudioExportData {
  audio_id: string | null
  volume_original: number
  volume_music: number
  trim_start: number
  trim_end: number
}

interface UseVideoAudioOptions {
  videoRef: React.RefObject<HTMLVideoElement>
}

// Creates a Howl that loops between trimStart and trimEnd.
// Returns a cancel function that stops the polling interval.
function createLoopingHowl(opts: {
  track: MusicTrack
  trimStart: number
  trimEnd: number
  volume: number
  isCurrent?: () => boolean
  onPlayStateChange?: (playing: boolean) => void
}): { howl: Howl; cancel: () => void } {
  const { track, trimStart, trimEnd, volume, isCurrent, onPlayStateChange } = opts
  const clampedEnd = Math.min(trimEnd, track.durationSecs)
  let cancelled = false
  let started = false          // guard: play() called at most once on creation
  let intervalId: ReturnType<typeof setInterval> | null = null

  const startPolling = () => {
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(() => {
      if (cancelled || (isCurrent && !isCurrent())) { clearInterval(intervalId!); return }
      if (!howl.playing()) return
      const pos = howl.seek() as number
      if (typeof pos === 'number' && pos >= clampedEnd) {
        howl.seek(trimStart)
      }
    }, 50)
  }

  const beginPlayback = () => {
    if (cancelled || started || (isCurrent && !isCurrent())) return
    started = true
    howl.seek(trimStart)
    howl.play()
  }

  const howl = new Howl({
    src: [track.audio_url],
    volume,
    html5: false, // Web Audio API — best seek precision; AudioContext unlocked via ensureAudioContextResumed()
    loop: false,
    onload: beginPlayback,
    onplay() {
      if (cancelled || (isCurrent && !isCurrent())) {
        howl.stop()
        return
      }
      startPolling()
      onPlayStateChange?.(true)
    },
    onpause() { onPlayStateChange?.(false) },
    onstop() { onPlayStateChange?.(false) },
    onend() {
      if (cancelled || (isCurrent && !isCurrent())) return
      howl.seek(trimStart)
      howl.play()
    },
    onloaderror: (_id, err) => console.warn('[Howl] load error', err),
  })
  // Cached Web Audio sources can already be loaded before onload wiring matters.
  // In that case, start from trimStart immediately instead of letting playback
  // fall through from 0:00.
  if (howl.state() === 'loaded') {
    beginPlayback()
  }

  const cancel = () => {
    cancelled = true
    if (intervalId) { clearInterval(intervalId); intervalId = null }
  }

  return { howl, cancel }
}

export function useVideoAudio({ videoRef }: UseVideoAudioOptions) {
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [volumeOriginal, setVolumeOriginalState] = useState(0.8)
  const [volumeMusic, setVolumeMusicState] = useState(0.8)
  const [favorites, setFavorites] = useState<string[]>([])

  // Two separate Howl slots — never overlap
  const musicHowlRef = useRef<Howl | null>(null)
  const musicCancelRef = useRef<(() => void) | null>(null)
  const previewHowlRef = useRef<Howl | null>(null)
  const previewCancelRef = useRef<(() => void) | null>(null)
  const musicInstanceRef = useRef(0)
  const previewInstanceRef = useRef(0)

  // Refs for values that closures need to read without re-creating effects
  const trimStartRef = useRef<number>(0)
  const trimEndRef = useRef<number>(0)
  const currentTrackRef = useRef<MusicTrack | null>(null)
  const volumeMusicRef = useRef<number>(0.8)
  const prevVideoTimeRef = useRef<number>(0)

  useEffect(() => { volumeMusicRef.current = volumeMusic }, [volumeMusic])

  // ── Helpers ──────────────────────────────────────────────────────

  const destroyMusic = useCallback(() => {
    musicInstanceRef.current += 1
    // Cancel poll first (sets cancelled=true inside closure) so no callbacks fire
    musicCancelRef.current?.()
    musicCancelRef.current = null
    const h = musicHowlRef.current
    musicHowlRef.current = null   // null ref BEFORE stop/unload so no re-entry
    if (h) { h.volume(0); h.off(); h.stop(); h.unload() }
    setPlayingTrackId(null)
  }, [])

  const destroyPreview = useCallback(() => {
    previewInstanceRef.current += 1
    previewCancelRef.current?.()
    previewCancelRef.current = null
    const h = previewHowlRef.current
    previewHowlRef.current = null  // null ref BEFORE stop/unload so no re-entry
    if (h) { h.volume(0); h.off(); h.stop(); h.unload() }
    setPreviewTrackId(null)
  }, [])

  // ── Video loop sync ───────────────────────────────────────────────
  // When the video loops back to the start, restart music from trimStart

  useEffect(() => {
    const video = videoRef.current
    if (!video || !selectedTrack) return

    const onTimeUpdate = () => {
      const ct = video.currentTime
      if (ct < prevVideoTimeRef.current - 0.5) {
        const howl = musicHowlRef.current
        if (howl && howl.state() === 'loaded') {
          howl.seek(trimStartRef.current)
          if (!howl.playing()) howl.play()
        }
      }
      prevVideoTimeRef.current = ct
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [videoRef, selectedTrack])

  // ── PREVIEW (inside modal) ────────────────────────────────────────
  // Plays with the current trimStart/trimEnd so the user hears the selected block.
  // Pauses the musicHowl while preview is active.

  const togglePlayTrack = useCallback((
    track: MusicTrack,
    trimStart: number,
    trimEnd: number,
  ) => {
    // Unlock AudioContext on mobile — must be called inside a user gesture handler
    ensureAudioContextResumed()
    const isSame = previewTrackId === track.id && previewHowlRef.current !== null

    if (isSame) {
      // Same track — toggle pause/resume, music howl stays paused
      const howl = previewHowlRef.current!
      if (howl.playing()) {
        howl.pause()
        setPreviewTrackId(null)
      } else {
        howl.seek(trimStart)
        howl.play()
        setPreviewTrackId(track.id)
      }
      return
    }

    // Different track (or first play) — kill everything first, then preview.
    // Destroying the applied music ensures only one audio source plays at a time.
    destroyPreview()
    destroyMusic()
    currentTrackRef.current = null
    setSelectedTrack(null)
    const previewInstance = ++previewInstanceRef.current

    const { howl, cancel } = createLoopingHowl({
      track,
      trimStart,
      trimEnd,
      volume: volumeMusicRef.current,
      isCurrent: () => previewInstanceRef.current === previewInstance,
      onPlayStateChange: (playing) => setPreviewTrackId(playing ? track.id : null),
    })

    previewHowlRef.current = howl
    previewCancelRef.current = cancel
    setPreviewTrackId(track.id)
  }, [previewTrackId, destroyPreview, destroyMusic])

  // ── SEEK PREVIEW on trim block release ───────────────────────────
  // Called immediately when the user releases the waveform block.
  // Jumps the preview to the new trimStart so they hear the new range instantly.

  const seekPreview = useCallback((trimStart: number, trimEnd: number) => {
    const howl = previewHowlRef.current
    if (!howl) return

    // Update the clampedEnd the poll reads — replace the cancel/poll pair
    previewCancelRef.current?.()

    if (howl.state() === 'loaded') {
      howl.seek(trimStart)
      if (!howl.playing()) howl.play()
    }

    // Re-attach a fresh polling interval with the new boundaries
    const clampedEnd = trimEnd
    let cancelled = false
    const intervalId = setInterval(() => {
      if (cancelled) { clearInterval(intervalId); return }
      if (!howl.playing()) return
      const pos = howl.seek() as number
      if (typeof pos === 'number' && pos >= clampedEnd) {
        howl.seek(trimStart)
      }
    }, 50)

    previewCancelRef.current = () => { cancelled = true; clearInterval(intervalId) }
  }, [])

  // ── APPLY ─────────────────────────────────────────────────────────
  // User taps "Aplicar". Destroy preview, build the real music Howl
  // that stays in sync with the video forever (or until cleared).

  const applyTrack = useCallback((
    track: MusicTrack,
    trimStart: number,
    trimEnd: number,
    volOriginal?: number,
    volMusic?: number,
  ) => {
    ensureAudioContextResumed()
    destroyPreview()
    destroyMusic()

    // Apply volumes from the modal if provided
    const finalVolMusic = volMusic ?? volumeMusicRef.current
    const finalVolOriginal = volOriginal ?? volumeOriginal

    if (volOriginal !== undefined) setVolumeOriginalState(volOriginal)
    if (volMusic !== undefined) { setVolumeMusicState(volMusic); volumeMusicRef.current = volMusic }

    currentTrackRef.current = track
    trimStartRef.current = trimStart
    trimEndRef.current = trimEnd
    prevVideoTimeRef.current = 0
    setSelectedTrack(track)
    const musicInstance = ++musicInstanceRef.current

    const { howl, cancel } = createLoopingHowl({
      track,
      trimStart,
      trimEnd,
      volume: finalVolMusic,
      isCurrent: () => musicInstanceRef.current === musicInstance,
      onPlayStateChange: (playing) => setPlayingTrackId(playing ? track.id : null),
    })

    musicHowlRef.current = howl
    musicCancelRef.current = cancel

    // Apply volume to video but never force-unmute — let the video element's
    // own muted attribute (controlled by the user's mute button) stay as-is
    if (videoRef.current) {
      videoRef.current.volume = finalVolOriginal
    }
  }, [destroyPreview, destroyMusic, volumeOriginal, videoRef])

  // ── SET TRIM WINDOW (timeline editor) ────────────────────────────
  // Updates the music Howl's trim boundaries without rebuilding it.

  const setTrimWindow = useCallback((trimStart: number, trimEnd: number) => {
    trimStartRef.current = trimStart
    trimEndRef.current = trimEnd

    const howl = musicHowlRef.current
    if (!howl) return

    musicCancelRef.current?.()

    if (howl.state() === 'loaded') {
      howl.seek(trimStart)
      if (!howl.playing()) howl.play()
    }

    let cancelled = false
    const intervalId = setInterval(() => {
      if (cancelled) { clearInterval(intervalId); return }
      if (!howl.playing()) return
      const pos = howl.seek() as number
      if (typeof pos === 'number' && pos >= trimEnd) {
        howl.seek(trimStart)
      }
    }, 50)

    musicCancelRef.current = () => { cancelled = true; clearInterval(intervalId) }
  }, [])

  // ── CLEAR ─────────────────────────────────────────────────────────

  const clearTrack = useCallback(() => {
    destroyPreview()
    destroyMusic()
    currentTrackRef.current = null
    trimStartRef.current = 0
    trimEndRef.current = 0
    setSelectedTrack(null)
    if (videoRef.current) videoRef.current.volume = 1
  }, [destroyPreview, destroyMusic, videoRef])

  // ── STOP ALL (modal close) ────────────────────────────────────────
  // Destroy preview and resume the video music if it was paused.

  const stopAll = useCallback(() => {
    // Only destroy the in-modal preview — never touch the music Howl here.
    // The music Howl is managed exclusively by applyTrack/clearTrack.
    destroyPreview()
  }, [destroyPreview])

  // ── VOLUME ────────────────────────────────────────────────────────

  const setVolumeOriginal = useCallback((v: number) => {
    setVolumeOriginalState(v)
    if (videoRef.current) videoRef.current.volume = v
  }, [videoRef])

  const setVolumeMusic = useCallback((v: number) => {
    setVolumeMusicState(v)
    musicHowlRef.current?.volume(v)
    previewHowlRef.current?.volume(v)
  }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volumeOriginal
  }, [volumeOriginal, videoRef])

  // ── FAVORITES ─────────────────────────────────────────────────────

  const toggleFavorite = useCallback((trackId: string) => {
    setFavorites(prev =>
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    )
  }, [])

  // ── EXPORT DATA ───────────────────────────────────────────────────

  const getExportData = useCallback((): AudioExportData => ({
    audio_id: selectedTrack?.id ?? null,
    volume_original: volumeOriginal,
    volume_music: volumeMusic,
    trim_start: trimStartRef.current,
    trim_end: trimEndRef.current,
  }), [selectedTrack, volumeOriginal, volumeMusic])

  // ── UNMOUNT CLEANUP ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      musicCancelRef.current?.()
      previewCancelRef.current?.()
      musicHowlRef.current?.unload()
      previewHowlRef.current?.unload()
    }
  }, [])

  return {
    selectedTrack,
    previewTrackId,
    playingTrackId,
    volumeOriginal,
    volumeMusic,
    favorites,
    applyTrack,
    togglePlayTrack,
    seekPreview,
    setTrimWindow,
    clearTrack,
    stopAll,
    setVolumeOriginal,
    setVolumeMusic,
    toggleFavorite,
    getExportData,
  }
}
