"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Type, ChevronLeft, ChevronRight, Check, Loader2, Music2, VolumeX, Volume2 } from "lucide-react"
import { Howler } from "howler"
import MusicSelectorModal from "../CreateVideo/components/MusicSelectorModal"
import type { MusicSelectorResult } from "../CreateVideo/components/MusicSelectorModal"
import { useVideoAudio } from "../../hooks/useVideoAudio"
import { useAudioTracks } from "../../hooks/useAudioTracks"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TextLayer {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  bold: boolean
}

interface StickerLayer {
  id: string
  emoji: string
  x: number
  y: number
  size: number
}

interface StoryEditorProps {
  file: File
  onPublish: (
    file: File,
    caption: string,
    music?: MusicSelectorResult,
    filterCss?: string,
    textLayers?: TextLayer[],
    stickerLayers?: StickerLayer[],
  ) => void
  onClose: () => void
  isUploading: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { name: "Original", css: "none" },
  { name: "Cine", css: "contrast(1.08) saturate(1.18) brightness(0.95) sepia(0.08)" },
  { name: "Aurora", css: "saturate(1.55) hue-rotate(295deg) brightness(1.06) contrast(1.08)" },
  { name: "Polar", css: "saturate(0.7) hue-rotate(180deg) brightness(1.08) contrast(1.03)" },
  { name: "Golden", css: "sepia(0.38) saturate(1.55) brightness(1.08) contrast(1.02)" },
  { name: "Noir", css: "grayscale(1) contrast(1.28) brightness(0.92)" },
  { name: "Vibrante", css: "saturate(2.25) contrast(1.12) brightness(1.04)" },
  { name: "Dream", css: "saturate(1.2) brightness(1.12) contrast(0.96) blur(0.2px)" },
  { name: "Tokyo", css: "saturate(1.7) hue-rotate(245deg) brightness(1.04) contrast(1.1)" },
  { name: "Retro", css: "sepia(0.52) saturate(1.35) contrast(1.14) hue-rotate(-10deg)" },
  { name: "Pop", css: "saturate(1.95) hue-rotate(320deg) contrast(1.12) brightness(1.02)" },
  { name: "Soft", css: "saturate(0.88) brightness(1.1) contrast(0.96)" },
  { name: "Teal", css: "saturate(1.15) hue-rotate(165deg) contrast(1.08) brightness(1.02)" },
  { name: "Sunkiss", css: "sepia(0.22) saturate(1.4) brightness(1.12) hue-rotate(-12deg)" },
  { name: "Ice", css: "saturate(0.9) hue-rotate(200deg) brightness(1.12) contrast(1.08)" },
  { name: "Luxe", css: "contrast(1.12) saturate(1.3) brightness(0.98) sepia(0.16) hue-rotate(8deg)" },
]

const TEXT_COLORS = ["#ffffff", "#000000", "#00f0ff", "#ff4fa3", "#ffd700", "#7c3aed"]

const STICKER_ROWS = [
  ["🔥", "✨", "💫", "⚡", "🌟", "💥", "🎉", "🎊"],
  ["❤️", "💜", "🖤", "💙", "🩷", "🤍", "💛", "🧡"],
  ["😍", "🥳", "😎", "🤩", "😈", "👑", "🦋", "🌈"],
  ["🎵", "🎶", "📸", "🎬", "🏆", "💎", "🚀", "🌙"],
]

const DEFAULT_FILTER_INDEX = 9

function uid() {
  return Math.random().toString(36).slice(2)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoryEditor({ file, onPublish, onClose, isUploading }: StoryEditorProps) {
  const isVideo = file.type.startsWith("video/")
  const mediaSrc = URL.createObjectURL(file)

  const [filterIdx, setFilterIdx] = useState(DEFAULT_FILTER_INDEX)
  const [tool, setTool] = useState<"none" | "text" | "sticker">("none")

  // Text layers
  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [editingText, setEditingText] = useState<TextLayer | null>(null)
  const [textColor, setTextColor] = useState(TEXT_COLORS[0])
  const [textBold, setTextBold] = useState(false)

  // Sticker layers
  const [stickerLayers, setStickerLayers] = useState<StickerLayer[]>([])

  // Video audio
  const [videoMuted, setVideoMuted] = useState(false)

  // Music
  const { tracks: apiTracks } = useAudioTracks()

  const [showMusicModal, setShowMusicModal] = useState(false)
  const [favorites, _setFavorites] = useState<string[]>([])
  const [appliedMusic, setAppliedMusic] = useState<MusicSelectorResult | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoDuration, setVideoDuration] = useState(15)
  const audioControls = useVideoAudio({ videoRef })
  const filterItemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Drag state
  const dragging = useRef<{ id: string; type: "text" | "sticker"; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    URL.revokeObjectURL(mediaSrc)
  }, [mediaSrc])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = audioControls.volumeOriginal;
    }
  }, [audioControls.volumeOriginal]);

  useEffect(() => {
    Howler.mute(videoMuted)
    // Cuando el editor se desmonta, asegúrate de desmutear Howler para no afectar al resto de la app
    return () => { Howler.mute(false) }
  }, [videoMuted])

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent, id: string, type: "text" | "sticker") => {
    e.stopPropagation()
    const layer = type === "text"
      ? textLayers.find(l => l.id === id)
      : stickerLayers.find(l => l.id === id)
    if (!layer) return
    dragging.current = { id, type, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y }
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [textLayers, stickerLayers])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const dx = (e.clientX - dragging.current.startX) / rect.width * 100
    const dy = (e.clientY - dragging.current.startY) / rect.height * 100
    const newX = Math.max(2, Math.min(95, dragging.current.origX + dx))
    const newY = Math.max(2, Math.min(95, dragging.current.origY + dy))
    const { id, type } = dragging.current
    if (type === "text") {
      setTextLayers(prev => prev.map(l => l.id === id ? { ...l, x: newX, y: newY } : l))
    } else {
      setStickerLayers(prev => prev.map(l => l.id === id ? { ...l, x: newX, y: newY } : l))
    }
  }, [])

  const onPointerUp = useCallback(() => { dragging.current = null }, [])

  // ── Add text ─────────────────────────────────────────────────────────────────

  const addText = () => {
    const layer: TextLayer = { id: uid(), text: "Escribe algo...", x: 30, y: 45, fontSize: 22, color: textColor, bold: textBold }
    setTextLayers(prev => [...prev, layer])
    setEditingText(layer)
    setTool("none")
  }

  const saveEditingText = (text: string) => {
    if (!editingText) return
    if (!text.trim()) {
      setTextLayers(prev => prev.filter(l => l.id !== editingText.id))
    } else {
      setTextLayers(prev => prev.map(l => l.id === editingText.id ? { ...l, text, color: textColor, bold: textBold } : l))
    }
    setEditingText(null)
  }

  // ── Add sticker ──────────────────────────────────────────────────────────────

  const addSticker = (emoji: string) => {
    setStickerLayers(prev => [...prev, { id: uid(), emoji, x: 40, y: 40, size: 48 }])
    setTool("none")
  }

  const currentFilter = FILTERS[filterIdx].css

  useEffect(() => {
    filterItemRefs.current[filterIdx]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    })
  }, [filterIdx])

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="fixed inset-0 z-[200] flex flex-col bg-black"
      >
        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden select-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Media */}
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaSrc}
              autoPlay
              loop
              muted={videoMuted}
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
              style={{ filter: currentFilter, objectPosition: "center center" }}
              onDurationChange={e => {
                const dur = e.currentTarget.duration
                if (isFinite(dur) && dur > 0) setVideoDuration(dur)
              }}
            />
          ) : (
            <img src={mediaSrc} alt=""
              className="absolute inset-0 w-full h-full object-contain bg-black"
              style={{ filter: currentFilter, objectPosition: "center center" }}
            />
          )}

          {/* Gradients */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Text layers */}
          {textLayers.map(layer => (
            <div key={layer.id}
              className="absolute cursor-grab active:cursor-grabbing touch-none"
              style={{ left: `${layer.x}%`, top: `${layer.y}%`, transform: "translate(-50%, -50%)" }}
              onPointerDown={e => onPointerDown(e, layer.id, "text")}
              onDoubleClick={() => setEditingText(layer)}
            >
              <span className="whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] select-none"
                style={{ fontSize: layer.fontSize, color: layer.color, fontWeight: layer.bold ? "900" : "600" }}>
                {layer.text}
              </span>
            </div>
          ))}

          {/* Sticker layers */}
          {stickerLayers.map(layer => (
            <div key={layer.id}
              className="absolute cursor-grab active:cursor-grabbing touch-none"
              style={{ left: `${layer.x}%`, top: `${layer.y}%`, transform: "translate(-50%, -50%)", fontSize: layer.size }}
              onPointerDown={e => onPointerDown(e, layer.id, "sticker")}
            >
              {layer.emoji}
            </div>
          ))}

          {/* ── Top bar ── */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-10 pb-2">
            {/* Close */}
            <button onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
              <X size={18} className="text-white" />
            </button>

            {/* Music button — center */}
            <div
              role="button"
              onClick={() => setShowMusicModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer backdrop-blur-sm border transition-all ${appliedMusic
                ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                : "bg-black/40 border-white/20 text-white"
                }`}
            >
              <Music2 size={14} />
              <span className="text-xs font-semibold truncate max-w-[140px]">
                {appliedMusic ? appliedMusic.track.title : "Añadir Sonido"}
              </span>
              {appliedMusic && (
                <button onClick={e => {
                  e.stopPropagation()
                  audioControls.stopAll()
                  audioControls.clearTrack()
                  setAppliedMusic(null)
                }}
                  className="ml-1 opacity-70 hover:opacity-100">
                  <VolumeX size={12} />
                </button>
              )}
            </div>

            {/* Text + Sticker tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTool(t => t === "text" ? "none" : "text")}
                className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all ${tool === "text" ? "bg-white text-black" : "bg-black/40 text-white"}`}
              >
                <Type size={17} />
              </button>
              <button
                onClick={() => setTool(t => t === "sticker" ? "none" : "sticker")}
                className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all ${tool === "sticker" ? "bg-white text-black" : "bg-black/40 text-white"}`}
              >
                <span className="text-base">😊</span>
              </button>
            </div>
          </div>

          {/* Music pill on canvas */}
          {appliedMusic && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 pointer-events-none">
              <Music2 size={12} className="text-cyan-400" />
              <span className="text-white text-[11px] font-medium truncate max-w-[200px]">{appliedMusic.track.title} · {appliedMusic.track.artist}</span>
            </div>
          )}
        </div>

        {/* ── Filter strip ── */}
        <div className="relative border-t border-white/5 bg-black/95">
          <button
            type="button"
            onClick={() => setFilterIdx(i => (i - 1 + FILTERS.length) % FILTERS.length)}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-md"
            aria-label="Filtro anterior"
          >
            <ChevronLeft size={16} className="text-white" />
          </button>

          <button
            type="button"
            onClick={() => setFilterIdx(i => (i + 1) % FILTERS.length)}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-md"
            aria-label="Filtro siguiente"
          >
            <ChevronRight size={16} className="text-white" />
          </button>

          <div
            className="flex items-start gap-2 px-16 py-3 overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {FILTERS.map((f, i) => (
              <button
                key={f.name}
                ref={el => { filterItemRefs.current[i] = el }}
                onClick={() => setFilterIdx(i)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all duration-200 snap-center ${filterIdx === i ? "scale-110 opacity-100" : "opacity-55"}`}
                style={{ width: "calc((100% - 2rem) / 5)" }}
              >
                <div
                  className="aspect-square w-full rounded-[18px] overflow-hidden border transition-all shadow-md shadow-black/25 bg-black"
                  style={{
                    borderColor: filterIdx === i ? "#00f0ff" : "rgba(255,255,255,0.08)",
                    boxShadow: filterIdx === i ? "0 0 0 2px rgba(0,240,255,0.15), 0 10px 20px rgba(0,0,0,0.35)" : undefined,
                  }}
                >
                  {isVideo
                    ? <video src={mediaSrc} className="h-full w-full object-cover" style={{ filter: f.css }} muted playsInline />
                    : <img src={mediaSrc} className="h-full w-full object-cover" style={{ filter: f.css }} alt={f.name} />
                  }
                </div>
                <span className={`text-[10px] font-semibold tracking-tight truncate text-center w-full ${filterIdx === i ? "text-white" : "text-white/75"}`}>{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Publish button ── */}
        <div className="flex items-center justify-between px-4 pb-8 pt-2 bg-black">
          {/* Mute toggle — solo si es video */}
          {isVideo ? (
            <button
              onClick={() => setVideoMuted(m => !m)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/10"
            >
              {videoMuted
                ? <VolumeX size={18} className="text-white/60" />
                : <Volume2 size={18} className="text-white" />
              }
            </button>
          ) : <div className="w-10" />}

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onPublish(file, "", appliedMusic ?? undefined, currentFilter, textLayers, stickerLayers)}
            disabled={isUploading}
            className="flex items-center gap-2 h-12 px-7 rounded-full font-bold text-white text-sm bg-white/15 border border-white/20 backdrop-blur-sm disabled:opacity-50"
          >
            {isUploading
              ? <><Loader2 size={18} className="animate-spin" /> Publicando...</>
              : <><Check size={18} strokeWidth={3} /> Publicar</>
            }
          </motion.button>
        </div>

        {/* ── Text tool panel ── */}
        <AnimatePresence>
          {tool === "text" && (
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              className="absolute bottom-36 inset-x-0 px-4 flex flex-col gap-3">
              <div className="flex justify-center gap-3">
                {TEXT_COLORS.map(c => (
                  <button key={c} onClick={() => setTextColor(c)}
                    className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ background: c, borderColor: textColor === c ? "#fff" : "transparent" }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 justify-center">
                <button onClick={() => setTextBold(b => !b)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-black transition-all ${textBold ? "bg-white text-black" : "bg-white/15 text-white"}`}>
                  B
                </button>
                <button onClick={addText}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-black text-sm font-bold">
                  <Type size={14} /> Agregar texto
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Sticker panel ── */}
        <AnimatePresence>
          {tool === "sticker" && (
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              className="absolute bottom-36 inset-x-0 px-4 bg-black/85 backdrop-blur-md rounded-t-2xl pb-4 pt-3">
              <div className="flex justify-center mb-2">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
              {STICKER_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-3 mb-2">
                  {row.map(emoji => (
                    <button key={emoji} onClick={() => addSticker(emoji)}
                      className="text-2xl hover:scale-125 transition-transform active:scale-95">
                      {emoji}
                    </button>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Inline text editor ── */}
        <AnimatePresence>
          {editingText && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="w-[90%] flex flex-col gap-3">
                <textarea
                  autoFocus
                  defaultValue={editingText.text === "Escribe algo..." ? "" : editingText.text}
                  className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                  rows={3}
                  placeholder="Escribe algo..."
                  style={{ color: textColor, fontWeight: textBold ? 900 : 600 }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      saveEditingText((e.target as HTMLTextAreaElement).value)
                    }
                  }}
                />
                <div className="flex gap-3">
                  <button onClick={() => setEditingText(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold">
                    Cancelar
                  </button>
                  <button
                    onClick={e => {
                      const ta = (e.target as HTMLButtonElement).closest("div")?.previousSibling as HTMLTextAreaElement
                      saveEditingText(ta?.value ?? "")
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold">
                    Listo
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Music Modal ── */}
      <AnimatePresence>
        {showMusicModal && (
          <MusicSelectorModal
            isOpen={showMusicModal}
            onClose={() => setShowMusicModal(false)}
            onApply={(res) => {
              audioControls.applyTrack(res.track, res.trim_start, res.trim_end, res.volume_original, res.volume_music)
              setAppliedMusic(res)
              setShowMusicModal(false)
              if (videoRef.current) {
                videoRef.current.currentTime = 0
                videoRef.current.play().catch(() => { })
              }
            }}
            onSelectAndPlay={(track, trimStart, trimEnd) => audioControls.togglePlayTrack(track, trimStart, trimEnd)}
            videoDuration={videoDuration}
            selectedTrack={audioControls.selectedTrack}
            previewTrackId={audioControls.previewTrackId}
            volumeOriginal={audioControls.volumeOriginal}
            volumeMusic={audioControls.volumeMusic}
            favorites={favorites}
            onToggleFavorite={audioControls.toggleFavorite}
            onClearTrack={() => {
              audioControls.stopAll()
              audioControls.clearTrack()
              setAppliedMusic(null)
            }}
            onSetVolumeOriginal={audioControls.setVolumeOriginal}
            onSetVolumeMusic={audioControls.setVolumeMusic}
            onSeekPreview={audioControls.seekPreview}
            tracks={apiTracks}
          />
        )}
      </AnimatePresence>
    </>
  )
}
