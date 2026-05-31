"use client"

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import {
  X, Search, Play, Pause, Heart, Check, Music2,
  Volume2, ChevronRight, Flame, Star, Sliders
} from "lucide-react"
import type { MusicTrack } from "../../../hooks/useVideoAudio"

/* ─────────────────────────────────────────────────────────────────
   MOCK DATA  (replace audio_url with your CDN/backend URLs)
───────────────────────────────────────────────────────────────── */
export const MOCK_TRACKS: MusicTrack[] = [
  {
    id: "t1", title: "Neon Pulse", artist: "KAIA",
    duration: "0:47", durationSecs: 47, category: "electronic",
    cover: "https://picsum.photos/seed/t1/80/80",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "t2", title: "Golden Hour", artist: "Sofía Vibe",
    duration: "1:02", durationSecs: 62, category: "chill",
    cover: "https://picsum.photos/seed/t2/80/80",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "t3", title: "Fuego Latino", artist: "El Ritmo",
    duration: "0:58", durationSecs: 58, category: "latin",
    cover: "https://picsum.photos/seed/t3/80/80",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: "t4", title: "Midnight Drive", artist: "Synthwave X",
    duration: "1:15", durationSecs: 75, category: "electronic",
    cover: "https://picsum.photos/seed/t4/80/80",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
  {
    id: "t5", title: "Urban Flow", artist: "K-Drop & Lena",
    duration: "0:53", durationSecs: 53, category: "urban",
    cover: "https://picsum.photos/seed/t5/80/80",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  },
  {
    id: "t6", title: "Sky High", artist: "Aerio",
    duration: "1:00", durationSecs: 60, category: "pop",
    cover: "https://picsum.photos/seed/t6/80/80",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
  },
  {
    id: "t7", title: "Deep Roots", artist: "Mango Collective",
    duration: "0:44", durationSecs: 44, category: "chill",
    cover: "https://picsum.photos/seed/t7/80/80",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
  },
  {
    id: "t8", title: "Ritmo del Sol", artist: "Naya Cruz",
    duration: "1:05", durationSecs: 65, category: "latin",
    cover: "https://picsum.photos/seed/t8/80/80",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  },
]

/* ─────────────────────────────────────────────────────────────────
   ANIMATED EQUALIZER BARS — pure CSS, zero JS animation overhead
───────────────────────────────────────────────────────────────── */
const EqBars: React.FC = () => (
  <div className="eq-bars flex items-end gap-[2px] h-4">
    {[0, 1, 2, 3, 4].map(i => (
      <div
        key={i}
        className="eq-bar w-[3px] rounded-full bg-gradient-to-t from-pink-500 to-orange-400"
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </div>
)

/* ─────────────────────────────────────────────────────────────────
   VOLUME SLIDER
───────────────────────────────────────────────────────────────── */
const VolumeSlider: React.FC<{
  label: string
  icon: React.ReactNode
  value: number
  onChange: (v: number) => void
  accentClass: string
}> = ({ label, icon, value, onChange, accentClass }) => (
  <div className="flex-1">
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <span className={`ml-auto text-[11px] font-bold ${accentClass}`}>
        {Math.round(value * 100)}%
      </span>
    </div>
    <div className="relative h-1.5 bg-white/10 rounded-full">
      <div
        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${
          accentClass.includes("pink") ? "from-pink-500 to-pink-400" : "from-orange-500 to-orange-400"
        }`}
        style={{ width: `${value * 100}%` }}
      />
      <input
        type="range"
        min={0} max={1} step={0.01}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        style={{ WebkitAppearance: "none" }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-black/40 border-2 border-white/80 pointer-events-none"
        style={{ left: `calc(${value * 100}% - 8px)` }}
      />
    </div>
  </div>
)

/* ─────────────────────────────────────────────────────────────────
   TRACK CARD — plain div, no framer-motion
───────────────────────────────────────────────────────────────── */
const TrackCard: React.FC<{
  track: MusicTrack
  isSelected: boolean
  isPreviewing: boolean
  isFavorite: boolean
  onPreview: () => void
  onFavorite: () => void
}> = ({ track, isSelected, isPreviewing, isFavorite, onPreview, onFavorite }) => (
  <div
    className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
      isSelected
        ? "bg-gradient-to-r from-pink-500/15 to-orange-400/15 border-pink-500/40"
        : "bg-white/[0.04] border-white/[0.07]"
    }`}
  >
    {/* Cover + play indicator */}
    <div className="relative flex-shrink-0">
      <img
        src={track.cover}
        alt={track.title}
        className="w-14 h-14 rounded-xl object-cover"
        loading="lazy"
      />
      {isPreviewing && (
        <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
          <EqBars />
        </div>
      )}
      {isSelected && !isPreviewing && (
        <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
            <Check size={11} className="text-black" />
          </div>
        </div>
      )}
    </div>

    {/* Info */}
    <div className="flex-1 text-left min-w-0">
      <p className={`text-sm font-semibold truncate ${isSelected ? "text-pink-300" : "text-white"}`}>
        {track.title}
      </p>
      <p className="text-[11px] text-gray-500 truncate mt-0.5">{track.artist}</p>
      <p className="text-[10px] text-gray-600 mt-0.5">{track.duration}</p>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        onClick={onFavorite}
        className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"
      >
        <Heart
          size={14}
          className={isFavorite ? "text-pink-500 fill-pink-500" : "text-gray-500"}
        />
      </button>

      <button
        onClick={onPreview}
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
          isPreviewing
            ? "bg-gradient-to-br from-pink-500 to-orange-400"
            : "bg-white/5"
        }`}
      >
        {isPreviewing
          ? <Pause size={13} className="text-white" />
          : <Play  size={13} className="text-gray-300 ml-0.5" />
        }
      </button>
    </div>
  </div>
)

/* ─────────────────────────────────────────────────────────────────
   WAVEFORM TRIMMER — refs for visual, no setState during drag
───────────────────────────────────────────────────────────────── */
const BARS = 60

function generateWaveform(seed: string): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return Array.from({ length: BARS }, (_, i) => {
    h = (Math.imul(1664525, h) + 1013904223) | 0
    const base = Math.abs(h % 100) / 100
    const envelope = Math.sin((i / BARS) * Math.PI) * 0.5 + 0.5
    return 0.15 + base * envelope * 0.85
  })
}

const AudioWaveformTrimmer: React.FC<{
  trackId: string
  duration: number
  windowSize: number
  trimStart: number
  trimEnd: number
  onTrimChange: (start: number, end: number) => void
  onTrimCommit: (start: number, end: number) => void
  formatTime: (s: number) => string
}> = ({ trackId, duration, windowSize, trimStart, trimEnd, onTrimChange, onTrimCommit, formatTime }) => {
  const bars = useMemo(() => generateWaveform(trackId), [trackId])
  const containerRef = useRef<HTMLDivElement>(null)
  // DOM refs for visual-only updates during drag — no setState
  const selectionRef  = useRef<HTMLDivElement>(null)
  const topBorderRef  = useRef<HTMLDivElement>(null)
  const botBorderRef  = useRef<HTMLDivElement>(null)
  const leftOverlayRef  = useRef<HTMLDivElement>(null)
  const rightOverlayRef = useRef<HTMLDivElement>(null)
  const timeLabelStartRef  = useRef<HTMLSpanElement>(null)
  const timeLabelEndRef    = useRef<HTMLSpanElement>(null)
  const timeLabelDurRef    = useRef<HTMLSpanElement>(null)

  // Refs so drag handlers always see fresh values
  const trimStartRef = useRef(trimStart)
  const trimEndRef   = useRef(trimEnd)
  const durationRef  = useRef(duration)
  const windowRef    = useRef(windowSize)
  useEffect(() => { trimStartRef.current = trimStart }, [trimStart])
  useEffect(() => { trimEndRef.current   = trimEnd   }, [trimEnd])
  useEffect(() => { durationRef.current  = duration  }, [duration])
  useEffect(() => { windowRef.current    = windowSize }, [windowSize])

  const applyVisual = useCallback((start: number, end: number) => {
    const dur = durationRef.current
    const startPct = Math.max(0, Math.min(1, start / dur)) * 100
    const endPct   = Math.max(0, Math.min(1, end   / dur)) * 100
    const widthPct  = endPct - startPct

    if (selectionRef.current) {
      selectionRef.current.style.left  = `${startPct}%`
      selectionRef.current.style.width = `${widthPct}%`
    }
    if (topBorderRef.current) {
      topBorderRef.current.style.left  = `${startPct}%`
      topBorderRef.current.style.width = `${widthPct}%`
    }
    if (botBorderRef.current) {
      botBorderRef.current.style.left  = `${startPct}%`
      botBorderRef.current.style.width = `${widthPct}%`
    }
    if (leftOverlayRef.current)  leftOverlayRef.current.style.width  = `${startPct}%`
    if (rightOverlayRef.current) rightOverlayRef.current.style.width = `${100 - endPct}%`

    if (timeLabelStartRef.current) timeLabelStartRef.current.textContent = formatTime(start)
    if (timeLabelEndRef.current)   timeLabelEndRef.current.textContent   = formatTime(end)
    if (timeLabelDurRef.current)   timeLabelDurRef.current.textContent   = formatTime(Math.max(0, end - start))
  }, [formatTime])

  // Sync DOM when props change (track switch, etc.)
  useEffect(() => { applyVisual(trimStart, trimEnd) }, [trimStart, trimEnd, applyVisual])

  const startBlockDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    const win     = windowRef.current
    const startX  = e.clientX
    const startAt = trimStartRef.current
    let latestStart = startAt

    const onMove = (ev: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const deltaSecs = ((ev.clientX - startX) / rect.width) * durationRef.current
      latestStart = Math.max(0, Math.min(startAt + deltaSecs, durationRef.current - win))
      // Update DOM directly — zero React re-renders during drag
      applyVisual(latestStart, latestStart + win)
      onTrimChange(latestStart, latestStart + win)
    }
    const onUp = () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      onTrimCommit(latestStart, latestStart + win)
    }
    document.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerup", onUp)
  }

  const startPct = Math.max(0, Math.min(1, trimStart / duration)) * 100
  const endPct   = Math.max(0, Math.min(1, trimEnd   / duration)) * 100

  return (
    <div className="space-y-2">
      {/* Time labels */}
      <div className="flex justify-between text-[10px] text-gray-400 font-mono px-1">
        <span ref={timeLabelStartRef}>{formatTime(trimStart)}</span>
        <span ref={timeLabelDurRef} className="text-pink-400 font-bold">
          {formatTime(Math.max(0, trimEnd - trimStart))}
        </span>
        <span ref={timeLabelEndRef}>{formatTime(trimEnd)}</span>
      </div>

      {/* Waveform container */}
      <div
        ref={containerRef}
        className="relative h-14 rounded-xl overflow-hidden bg-[#0d0d1a] border border-white/10 select-none touch-none"
      >
        {/* Dark overlays outside selection */}
        <div ref={leftOverlayRef}  className="absolute inset-y-0 left-0 bg-black/60 z-10 pointer-events-none"
          style={{ width: `${startPct}%` }} />
        <div ref={rightOverlayRef} className="absolute inset-y-0 right-0 bg-black/60 z-10 pointer-events-none"
          style={{ width: `${100 - endPct}%` }} />

        {/* Selection top/bottom border */}
        <div ref={topBorderRef} className="absolute top-0 h-[2px] bg-pink-500 z-20 pointer-events-none"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
        <div ref={botBorderRef} className="absolute bottom-0 h-[2px] bg-pink-500 z-20 pointer-events-none"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />

        {/* Waveform bars */}
        <div className="absolute inset-0 flex items-center gap-px px-1 pointer-events-none">
          {bars.map((h, i) => {
            const barRatio = i / BARS
            const inSel = barRatio >= startPct / 100 && barRatio < endPct / 100
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h * 100}%`,
                  background: inSel
                    ? "linear-gradient(to top, #ec4899, #fb923c)"
                    : "rgba(255,255,255,0.13)",
                }}
              />
            )
          })}
        </div>

        {/* Selection window — draggable block */}
        <div
          ref={selectionRef}
          className="absolute inset-y-0 z-20 cursor-grab active:cursor-grabbing"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%`, touchAction: "none" }}
          onPointerDown={startBlockDrag}
        >
          {/* Left edge handle */}
          <div className="absolute left-0 inset-y-0 w-[10px] rounded-l-lg bg-pink-500 shadow-lg shadow-pink-500/40 flex flex-col items-center justify-center gap-[3px]">
            {[0,1,2].map(i => <div key={i} className="w-[2px] h-3 rounded-full bg-black/35" />)}
          </div>
          {/* Top & bottom border */}
          <div className="absolute top-0 left-[10px] right-[10px] h-[2px] bg-pink-500 pointer-events-none" />
          <div className="absolute bottom-0 left-[10px] right-[10px] h-[2px] bg-pink-500 pointer-events-none" />
          {/* Right edge handle */}
          <div className="absolute right-0 inset-y-0 w-[10px] rounded-r-lg bg-pink-500 shadow-lg shadow-pink-500/40 flex flex-col items-center justify-center gap-[3px]">
            {[0,1,2].map(i => <div key={i} className="w-[2px] h-3 rounded-full bg-black/35" />)}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-white/30 text-center">
        Arrastra el bloque para elegir qué parte del audio usar · Duración total: {formatTime(duration)}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   MAIN MODAL
───────────────────────────────────────────────────────────────── */
export interface MusicSelectorResult {
  track: MusicTrack
  audio_id: string
  volume_original: number
  volume_music: number
  trim_start: number
  trim_end: number
}

interface MusicSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (result: MusicSelectorResult) => void
  selectedTrack: MusicTrack | null
  appliedTrimStart?: number
  appliedTrimEnd?: number
  previewTrackId: string | null
  volumeOriginal: number
  volumeMusic: number
  favorites: string[]
  videoDuration?: number
  tracks?: MusicTrack[]
  tracksLoading?: boolean
  onSelectAndPlay: (track: MusicTrack, trimStart: number, trimEnd: number) => void
  onToggleFavorite: (id: string) => void
  onClearTrack: () => void
  onSetVolumeOriginal: (v: number) => void
  onSetVolumeMusic: (v: number) => void
  onSeekPreview?: (trimStart: number, trimEnd: number) => void
}

const TABS = [
  { id: "trending", label: "Tendencias", icon: Flame },
  { id: "favorites", label: "Favoritos",  icon: Star  },
] as const

const MusicSelectorModal: React.FC<MusicSelectorModalProps> = ({
  isOpen, onClose, onApply,
  selectedTrack, appliedTrimStart = 0, appliedTrimEnd,
  previewTrackId,
  volumeOriginal, volumeMusic, favorites,
  videoDuration,
  tracks: tracksProp,
  onSelectAndPlay, onToggleFavorite, onClearTrack,
  onSetVolumeOriginal, onSetVolumeMusic, onSeekPreview,
}) => {
  const sourceList = tracksProp ?? MOCK_TRACKS


  const [tab, setTab] = useState<"trending" | "favorites">("trending")
  const [query, setQuery] = useState("")
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const trimEndRef = useRef(0)
  trimEndRef.current = trimEnd
  const [showMixer, setShowMixer] = useState(false)
  const [activeTrack, setActiveTrack] = useState<MusicTrack | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const previewSeekRafRef = useRef<number | null>(null)
  const previewSeekLatestRef = useRef<{ start: number; end: number } | null>(null)

  const trackDuration = Math.max(1, activeTrack?.durationSecs ?? 1)

  const windowSize = videoDuration && videoDuration > 0
    ? Math.min(videoDuration, trackDuration)
    : trackDuration

  const formatTime = (secs: number) => {
    const s = Math.max(0, secs)
    const minutes = Math.floor(s / 60)
    const seconds = Math.floor(s % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setShowMixer(false)
      setActiveTrack(null)
      setTrimStart(0)
      setTrimEnd(0)
      return
    }
    if (selectedTrack) {
      setActiveTrack(selectedTrack)
      setShowMixer(true)
      const win = videoDuration && videoDuration > 0
        ? Math.min(videoDuration, selectedTrack.durationSecs)
        : selectedTrack.durationSecs
      const nextStart = Math.max(0, Math.min(appliedTrimStart, selectedTrack.durationSecs))
      const fallbackEnd = nextStart + win
      const nextEnd = Math.max(
        nextStart,
        Math.min(appliedTrimEnd ?? fallbackEnd, selectedTrack.durationSecs)
      )
      setTrimStart(nextStart)
      setTrimEnd(nextEnd)
    } else {
      setTrimStart(0)
      setTrimEnd(0)
    }
  }, [isOpen, selectedTrack, videoDuration, appliedTrimStart, appliedTrimEnd])

  useEffect(() => {
    return () => {
      if (previewSeekRafRef.current !== null) {
        cancelAnimationFrame(previewSeekRafRef.current)
        previewSeekRafRef.current = null
      }
      previewSeekLatestRef.current = null
    }
  }, [])

  const schedulePreviewSeek = useCallback((start: number, end: number) => {
    if (!onSeekPreview) return
    previewSeekLatestRef.current = { start, end }
    if (previewSeekRafRef.current !== null) return
    previewSeekRafRef.current = requestAnimationFrame(() => {
      previewSeekRafRef.current = null
      const latest = previewSeekLatestRef.current
      if (!latest) return
      onSeekPreview(latest.start, latest.end)
    })
  }, [onSeekPreview])

  const commitPreviewSeek = useCallback((start: number, end: number) => {
    if (previewSeekRafRef.current !== null) {
      cancelAnimationFrame(previewSeekRafRef.current)
      previewSeekRafRef.current = null
    }
    previewSeekLatestRef.current = { start, end }
    onSeekPreview?.(start, end)
  }, [onSeekPreview])

  const handleSelectAndPlay = (track: MusicTrack) => {
    let start = trimStart
    let end = trimEnd

    if (activeTrack?.id !== track.id) {
      const win = videoDuration && videoDuration > 0
        ? Math.min(videoDuration, track.durationSecs)
        : track.durationSecs
      start = 0
      end = win
      setActiveTrack(track)
      setTrimStart(start)
      setTrimEnd(end)
      setShowMixer(true)
    }

    onSelectAndPlay(track, start, end)
  }

  const tracks = useMemo(() => {
    let list = sourceList
    if (tab === "favorites") list = list.filter(t => favorites.includes(t.id))
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      )
    }
    return list
  }, [sourceList, tab, query, favorites])

  const handleApply = () => {
    if (!activeTrack) return
    onApply({
      track: activeTrack,
      audio_id: activeTrack.id,
      volume_original: volumeOriginal,
      volume_music: volumeMusic,
      trim_start: trimStart,
      trim_end: trimEnd,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: "rgba(5,5,16,0.96)", display: isOpen ? "flex" : "none" }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
        <div className="w-10 h-1 rounded-full bg-white/30 active:bg-white/60 transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="w-9" />

        <div className="text-center">
          <h2 className="text-white font-bold text-base tracking-wide">Añadir Música</h2>
          <p className="text-gray-500 text-[10px] mt-0.5">Buzzy Sound Library</p>
        </div>

        <button
          onClick={() => setShowMixer(m => !m)}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
            showMixer
              ? "bg-gradient-to-br from-pink-500/20 to-orange-400/20 border-pink-500/50"
              : "bg-white/[0.06] border-white/10"
          }`}
        >
          <Sliders size={16} className={showMixer ? "text-pink-400" : "text-gray-400"} />
        </button>
      </div>

      {/* Mixer — no AnimatePresence, simple conditional render */}
      {activeTrack && showMixer && (
        <div className="px-5 mb-3">
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-4">
            <div className="flex gap-3">
              <VolumeSlider
                label="Original"
                icon={<Volume2 size={13} className="text-pink-400" />}
                value={volumeOriginal}
                onChange={onSetVolumeOriginal}
                accentClass="text-pink-400"
              />
              <VolumeSlider
                label="Música"
                icon={<Music2 size={13} className="text-orange-400" />}
                value={volumeMusic}
                onChange={onSetVolumeMusic}
                accentClass="text-orange-400"
              />
            </div>
            <div className="h-px bg-white/5" />
            <div>
              
              <AudioWaveformTrimmer
                trackId={activeTrack.id}
                duration={trackDuration}
                windowSize={windowSize}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onTrimChange={(start, end) => {
                  setTrimStart(start)
                  setTrimEnd(end)
                  schedulePreviewSeek(start, end)
                }}
                onTrimCommit={(start, end) => {
                  setTrimStart(start)
                  setTrimEnd(end)
                  commitPreviewSeek(start, end)
                }}
                formatTime={formatTime}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="px-5 mb-3">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 focus-within:border-pink-500/40 transition-colors">
          <Search size={15} className="text-gray-500 flex-shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar artista o canción…"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={14} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 mb-4">
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                active
                  ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/30"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              <t.icon size={13} />
              {t.label}
              {t.id === "favorites" && favorites.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? "bg-white/20" : "bg-white/10"
                }`}>
                  {favorites.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Music2 size={28} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm text-center">
              {tab === "favorites" ? "No tienes favoritos aún" : "No se encontraron canciones"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                isSelected={activeTrack?.id === track.id}
                isPreviewing={previewTrackId === track.id}
                isFavorite={favorites.includes(track.id)}
                onPreview={() => handleSelectAndPlay(track)}
                onFavorite={() => onToggleFavorite(track.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-5 pb-8 pt-3 border-t border-white/[0.08] bg-[#05050f]">
        {activeTrack ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  src={activeTrack.cover}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                  <Check size={9} className="text-black font-bold" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{activeTrack.title}</p>
                <p className="text-gray-500 text-[10px] truncate">{activeTrack.artist}</p>
              </div>
            </div>

            <button
              onClick={onClearTrack}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-medium"
            >
              Quitar
            </button>

            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xs font-bold shadow-lg shadow-pink-500/25"
            >
              Aplicar
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-600 text-xs py-1">
            Selecciona una canción para añadirla a tu video
          </p>
        )}
      </div>
    </div>
  )
}

export default MusicSelectorModal
