import { useState, useRef, useCallback, useEffect } from 'react'
import { Howl, Howler } from 'howler'
import { fetchFavoriteTracks, toggleFavoriteTrack } from '../redux/actions/favoriteTracks'

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

// ─── Audio cache ─────────────────────────────────────────────────────────────
// One level only: fetch() → ArrayBuffer → blob URL (stays in memory, no re-fetch)
// Each playback session creates a fresh Howl from the blob — no stale state issues
const MAX_CACHE = 10
const audioCache = new Map<string, Promise<string>>()  // original url → blob URL promise

function evictIfNeeded() {
  if (audioCache.size >= MAX_CACHE) {
    const oldest = audioCache.keys().next().value!
    audioCache.delete(oldest)
  }
}

export function prefetchAudioUrl(url: string): Promise<string> {
  return prefetchAudio(url)
}

function prefetchAudio(url: string): Promise<string> {
  if (audioCache.has(url)) return audioCache.get(url)!
  evictIfNeeded()
  const p = fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`audio fetch failed: ${r.status}`)
      return r.arrayBuffer()
    })
    .then(buf => URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' })))
    .catch(err => {
      // Remove the failed entry so the next attempt retries the network request
      audioCache.delete(url)
      return Promise.reject(err)
    })
  audioCache.set(url, p)
  return p
}

function makeFreshHowl(blobUrl: string, volume: number): Howl {
  return new Howl({
    src: [blobUrl],
    format: ['mp3'],
    html5: false,
    loop: false,
    preload: true,
    volume,
  })
}

// Warm up: fetch the audio bytes into memory before the user taps anything
export function preloadTracks(tracks: MusicTrack[], count = 4) {
  tracks.slice(0, count).forEach(t => prefetchAudio(t.audio_url))
}

// ─── Looping playback helper ──────────────────────────────────────────────────
// Reuses a cached Howl. NEVER calls howl.off() globally — that clears Howler's
// internal load listeners and forces a re-fetch. Instead we use per-call IDs
// on each listener and remove only those when stopping.
function playFromCache(opts: {
  track: MusicTrack
  getTrimStart: () => number
  getTrimEnd: () => number
  volume: number
  isCurrent: () => boolean
  onPlayStateChange: (playing: boolean) => void
  onHowlReady?: (h: Howl) => void
}): { howl: Howl | null; stop: () => void } {
  const { track, getTrimStart, getTrimEnd, volume, isCurrent, onPlayStateChange, onHowlReady } = opts
  let stopped = false
  let rafId = 0
  let howl: Howl | null = null

  const stopHandle = () => {
    stopped = true
    cancelAnimationFrame(rafId)
    if (howl) {
      howl.off('play',  onPlay)
      howl.off('pause', onPause)
      howl.off('stop',  onStop)
      howl.off('end',   onEnd)
      if (howl.playing()) howl.stop()
    }
    onPlayStateChange(false)
  }

  const scheduleLoop = () => {
    rafId = requestAnimationFrame(() => {
      if (stopped || !isCurrent()) return
      if (howl?.playing()) {
        const pos = howl.seek() as number
        const trimStart = getTrimStart()
        const trimEnd = Math.min(getTrimEnd(), track.durationSecs)
        if (pos >= trimEnd) howl.seek(trimStart)
      }
      scheduleLoop()
    })
  }

  const doPlay = (h: Howl) => {
    if (stopped || !isCurrent()) return
    h.seek(getTrimStart())
    h.volume(volume)
    h.play()
  }

  const onPlay = () => {
    if (stopped || !isCurrent()) { howl?.stop(); return }
    scheduleLoop()
    onPlayStateChange(true)
  }
  const onPause = () => onPlayStateChange(false)
  const onStop  = () => onPlayStateChange(false)
  const onEnd   = () => {
    if (stopped || !isCurrent()) return
    howl?.seek(getTrimStart())
    howl?.play()
  }

  // blob already in memory (or fetch now) → create fresh Howl → play instantly
  prefetchAudio(track.audio_url).then(blobUrl => {
    if (stopped || !isCurrent()) return
    howl = makeFreshHowl(blobUrl, volume)
    onHowlReady?.(howl)
    howl.on('play',  onPlay)
    howl.on('pause', onPause)
    howl.on('stop',  onStop)
    howl.on('end',   onEnd)
    if (howl.state() === 'loaded') {
      doPlay(howl)
    } else {
      howl.once('load', () => doPlay(howl!))
    }
  })

  return { howl, stop: stopHandle }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useVideoAudio({ videoRef }: UseVideoAudioOptions) {
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [volumeOriginal, setVolumeOriginalState] = useState(0.8)
  const [volumeMusic, setVolumeMusicState] = useState(0.8)
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    fetchFavoriteTracks().then(setFavorites).catch(() => {})
  }, [])

  // Refs for active playback sessions
  const musicStopRef = useRef<(() => void) | null>(null)
  const previewStopRef = useRef<(() => void) | null>(null)
  const musicHowlRef = useRef<Howl | null>(null)
  const previewHowlRef = useRef<Howl | null>(null)
  const musicInstanceRef = useRef(0)
  const previewInstanceRef = useRef(0)

  const trimStartRef = useRef<number>(0)
  const trimEndRef = useRef<number>(0)
  const currentTrackRef = useRef<MusicTrack | null>(null)
  const volumeMusicRef = useRef<number>(0.8)
  const prevVideoTimeRef = useRef<number>(0)

  useEffect(() => { volumeMusicRef.current = volumeMusic }, [volumeMusic])

  const destroyMusic = useCallback(() => {
    musicInstanceRef.current += 1
    musicStopRef.current?.()
    musicStopRef.current = null
    musicHowlRef.current = null
    setPlayingTrackId(null)
  }, [])

  const destroyPreview = useCallback(() => {
    previewInstanceRef.current += 1
    previewStopRef.current?.()
    previewStopRef.current = null
    previewHowlRef.current = null
    setPreviewTrackId(null)
  }, [])

  // Sync music to video seeks
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

  const togglePlayTrack = useCallback((
    track: MusicTrack,
    trimStart: number,
    trimEnd: number,
  ) => {
    ensureAudioContextResumed()
    trimStartRef.current = trimStart
    trimEndRef.current = trimEnd

    // If same track is already loaded and playing/paused, just toggle
    const isSame = previewTrackId === track.id
    if (isSame && previewHowlRef.current !== null) {
      const howl = previewHowlRef.current
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

    destroyPreview()
    destroyMusic()
    currentTrackRef.current = null
    setSelectedTrack(null)
    const previewInstance = ++previewInstanceRef.current

    const { stop } = playFromCache({
      track,
      getTrimStart: () => trimStartRef.current,
      getTrimEnd: () => trimEndRef.current,
      volume: volumeMusicRef.current,
      isCurrent: () => previewInstanceRef.current === previewInstance,
      onHowlReady: (h) => { if (previewInstanceRef.current === previewInstance) previewHowlRef.current = h },
      onPlayStateChange: (playing) => setPreviewTrackId(playing ? track.id : null),
    })

    previewStopRef.current = stop
    setPreviewTrackId(track.id)
  }, [previewTrackId, destroyPreview, destroyMusic])

  const seekPreview = useCallback((trimStart: number, trimEnd: number) => {
    const howl = previewHowlRef.current
    if (!howl || howl.state() !== 'loaded') return
    trimStartRef.current = trimStart
    trimEndRef.current = trimEnd
    howl.seek(trimStart)
    if (!howl.playing()) howl.play()
  }, [])

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

    const { stop } = playFromCache({
      track,
      getTrimStart: () => trimStartRef.current,
      getTrimEnd: () => trimEndRef.current,
      volume: finalVolMusic,
      isCurrent: () => musicInstanceRef.current === musicInstance,
      onHowlReady: (h) => { if (musicInstanceRef.current === musicInstance) musicHowlRef.current = h },
      onPlayStateChange: (playing) => setPlayingTrackId(playing ? track.id : null),
    })

    musicStopRef.current = stop

    if (videoRef.current) {
      videoRef.current.volume = finalVolOriginal
    }
  }, [destroyPreview, destroyMusic, volumeOriginal, videoRef])

  const setTrimWindow = useCallback((trimStart: number, trimEnd: number) => {
    trimStartRef.current = trimStart
    trimEndRef.current = trimEnd

    const howl = musicHowlRef.current
    if (!howl || howl.state() !== 'loaded') return
    howl.seek(trimStart)
    if (!howl.playing()) howl.play()
  }, [])

  const clearTrack = useCallback(() => {
    destroyPreview()
    destroyMusic()
    currentTrackRef.current = null
    trimStartRef.current = 0
    trimEndRef.current = 0
    setSelectedTrack(null)
    if (videoRef.current) videoRef.current.volume = volumeOriginal
  }, [destroyPreview, destroyMusic, videoRef, volumeOriginal])

  const stopAll = useCallback(() => {
    destroyPreview()
  }, [destroyPreview])

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

  const toggleFavorite = useCallback((trackId: string) => {
    setFavorites(prev =>
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    )
    toggleFavoriteTrack(trackId).then(favorited => {
      setFavorites(prev =>
        favorited
          ? prev.includes(trackId) ? prev : [...prev, trackId]
          : prev.filter(id => id !== trackId)
      )
    }).catch(() => {
      setFavorites(prev =>
        prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
      )
    })
  }, [])

  const getExportData = useCallback((): AudioExportData => ({
    audio_id: selectedTrack?.id ?? null,
    volume_original: volumeOriginal,
    volume_music: volumeMusic,
    trim_start: trimStartRef.current,
    trim_end: trimEndRef.current,
  }), [selectedTrack, volumeOriginal, volumeMusic])

  useEffect(() => {
    return () => {
      musicStopRef.current?.()
      previewStopRef.current?.()
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
