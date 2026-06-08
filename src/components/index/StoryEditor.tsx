"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Type, ChevronLeft, ChevronRight, Check, Loader2, Music2, VolumeX, Volume2, MapPin, Smile, Sparkles, Images } from "lucide-react"

const MY_STICKERS_KEY = "buzzy_my_stickers"
interface SavedSticker { id: string; src: string; name: string }
function loadMyStickers(): SavedSticker[] {
  try { return JSON.parse(localStorage.getItem(MY_STICKERS_KEY) || "[]") } catch { return [] }
}
function saveMyStickers(list: SavedSticker[]) {
  localStorage.setItem(MY_STICKERS_KEY, JSON.stringify(list))
}
import { Autocomplete, useLoadScript } from "@react-google-maps/api"
import { Howler } from "howler"
import MusicSelectorModal from "../CreateVideo/components/MusicSelectorModal"
import type { MusicSelectorResult } from "../CreateVideo/components/MusicSelectorModal"
import { useVideoAudio, preloadTracks } from "../../hooks/useVideoAudio"
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

type StickerLayer =
  | {
      id: string
      kind: "emoji"
      emoji: string
      x: number
      y: number
      size: number
      rotation: number
    }
  | {
      id: string
      kind: "location"
      text: string
      x: number
      y: number
      size: number
      rotation: number
    }
  | {
      id: string
      kind: "image"
      src: string
      x: number
      y: number
      size: number
      rotation: number
    }
  | {
      id: string
      kind: "video"
      src: string
      x: number
      y: number
      size: number
      rotation: number
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
    location?: string,
    stickerFiles?: { id: string; file: File }[],
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

const FEATURED_STICKERS = [
  { label: "Brillo", kind: "emoji" as const, emoji: "✨", description: "Resalta un momento" },
  { label: "Fuego", kind: "emoji" as const, emoji: "🔥", description: "Dale energía" },
  { label: "Corazón", kind: "emoji" as const, emoji: "❤️", description: "Un toque romántico" },
  { label: "Música", kind: "emoji" as const, emoji: "🎵", description: "Ideal para clips" },
  { label: "Ubicación", kind: "location" as const, description: "Pégala sobre la historia" },
  { label: "Mención", kind: "emoji" as const, emoji: "@", description: "Etiqueta a alguien" },
]

const LOCATION_SUGGESTIONS = [
  "Ciudad de México",
  "Miami, FL",
  "Madrid",
  "Nueva York",
  "Bogotá",
  "Buenos Aires",
]

const GOOGLE_LIBRARIES: ("places")[] = ["places"]

const DEFAULT_FILTER_INDEX = 0

function uid() {
  return Math.random().toString(36).slice(2)
}

function getShortLocationLabel(label: string) {
  const trimmed = label.trim()
  if (!trimmed) return trimmed
  const mainPart = trimmed.split(",")[0]?.trim() || trimmed
  if (mainPart.length <= 22) return mainPart
  return `${mainPart.slice(0, 21).trimEnd()}…`
}

function getLocationStickerTone(label: string) {
  const value = label.toLowerCase()
  if (value.includes("playa") || value.includes("beach")) return "from-cyan-400 via-sky-500 to-indigo-500"
  if (value.includes("santo domingo") || value.includes("dominicana")) return "from-fuchsia-500 via-pink-500 to-orange-400"
  if (value.includes("nueva york") || value.includes("new york")) return "from-violet-500 via-fuchsia-500 to-pink-500"
  if (value.includes("madrid") || value.includes("barcelona")) return "from-amber-500 via-orange-500 to-rose-500"
  return "from-pink-500 via-fuchsia-500 to-orange-400"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoryEditor({ file, onPublish, onClose, isUploading }: StoryEditorProps) {
  const isVideo = file.type.startsWith("video/")
  const [mediaSrc, setMediaSrc] = useState("")

  const [filterIdx, setFilterIdx] = useState(DEFAULT_FILTER_INDEX)
  const [tool, setTool] = useState<"none" | "text" | "sticker">("none")
  const [stickerTab, setStickerTab] = useState<"featured" | "emoji" | "location" | "my">("featured")

  // Text layers
  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [editingText, setEditingText] = useState<TextLayer | null>(null)
  const [textColor, setTextColor] = useState(TEXT_COLORS[0])
  const [textBold, setTextBold] = useState(false)

  // Sticker layers
  const [stickerLayers, setStickerLayers] = useState<StickerLayer[]>([])
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null)

  // My stickers list (saved in localStorage) + files to upload on publish
  const [myStickers, setMyStickers] = useState<SavedSticker[]>(() => loadMyStickers())
  const [pendingStickerFiles, setPendingStickerFiles] = useState<{ id: string; file: File }[]>([])

  // Video audio
  const [videoMuted, setVideoMuted] = useState(false)

  // Music
  const { tracks: apiTracks } = useAudioTracks()

  const [showMusicModal, setShowMusicModal] = useState(false)
  const [favorites, _setFavorites] = useState<string[]>([])
  const [appliedMusic, setAppliedMusic] = useState<MusicSelectorResult | null>(null)

  const [location, setLocation] = useState("")
  const [locationDraft, setLocationDraft] = useState("")
  const [locationAutocomplete, setLocationAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const stickerFileInputRef = useRef<HTMLInputElement>(null)
  const videoStickerInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const { isLoaded: isMapsLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_LIBRARIES,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoDuration, setVideoDuration] = useState(15)
  const audioControls = useVideoAudio({ videoRef })
  const filterItemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Drag state
  const dragging = useRef<{ id: string; type: "text" | "sticker"; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const rotationDragging = useRef<{ id: string; startAngle: number; startRotation: number; centerX: number; centerY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nextSrc = URL.createObjectURL(file)
    setMediaSrc(nextSrc)
    return () => {
      URL.revokeObjectURL(nextSrc)
    }
  }, [file])

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
    if (type === "sticker") setSelectedStickerId(id)
    const layer = type === "text"
      ? textLayers.find(l => l.id === id)
      : stickerLayers.find(l => l.id === id)
    if (!layer) return
    dragging.current = { id, type, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y }
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [textLayers, stickerLayers])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (rotationDragging.current && canvasRef.current) {
      const { id, startAngle, startRotation, centerX, centerY } = rotationDragging.current
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
      const nextRotation = startRotation + (currentAngle - startAngle)
      setStickerLayers(prev => prev.map(layer => (
        layer.id === id ? { ...layer, rotation: nextRotation } : layer
      )))
      return
    }
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

  const onPointerUp = useCallback(() => {
    dragging.current = null
    rotationDragging.current = null
  }, [])

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
    const id = uid()
    setStickerLayers(prev => [...prev, { id, kind: "emoji", emoji, x: 40, y: 40, size: 48, rotation: 0 }])
    setSelectedStickerId(id)
    setTool("none")
  }

  const addLocationSticker = (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    setLocation(trimmed)
    setLocationDraft(trimmed)
    const id = uid()
    setStickerLayers(prev => [
      ...prev.filter(layer => layer.kind !== "location"),
      { id, kind: "location", text: trimmed, x: 50, y: 78, size: 18, rotation: 0 },
    ])
    setSelectedStickerId(id)
    setStickerTab("location")
    setTool("none")
  }

  const onLoadLocationAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
    setLocationAutocomplete(autocomplete)
  }

  const onPlaceChanged = () => {
    if (!locationAutocomplete) return
    const place = locationAutocomplete.getPlace()
    const placeName = place.formatted_address || place.name
    if (!placeName) return
    setLocationDraft(placeName)
    addLocationSticker(placeName)
  }

  const addImageStickerFromFile = (file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result || "")
      if (!src) return
      const id = uid()
      // Save to my stickers list
      const saved: SavedSticker = { id, src, name: file.name }
      setMyStickers(prev => {
        const next = [saved, ...prev].slice(0, 30)
        saveMyStickers(next)
        return next
      })
      // Track file for server upload on publish (avoid sending large base64)
      setPendingStickerFiles(prev => [...prev, { id, file }])
      setStickerLayers(prev => [
        ...prev,
        { id, kind: "image", src, x: 50, y: 42, size: 72, rotation: 0 },
      ])
      setSelectedStickerId(id)
      setStickerTab("my")
      setTool("none")
    }
    reader.readAsDataURL(file)
  }

  const addVideoStickerFromFile = (file: File) => {
    if (!file.type.startsWith("video/")) return
    const src = URL.createObjectURL(file)
    const id = uid()
    setPendingStickerFiles(prev => [...prev, { id, file }])
    setStickerLayers(prev => [
      ...prev,
      { id, kind: "video", src, x: 50, y: 42, size: 72, rotation: 0 },
    ])
    setSelectedStickerId(id)
    setStickerTab("my")
    setTool("none")
  }

  const addStickerFromSaved = (saved: SavedSticker) => {
    const id = uid()
    // Reconvert base64 → File so the backend receives the actual file on publish
    if (saved.src.startsWith("data:")) {
      const [header, b64] = saved.src.split(",")
      const mime = header.match(/:(.*?);/)?.[1] || "image/png"
      const ext = mime.split("/")[1] || "png"
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const file = new File([bytes], `${saved.name || id}.${ext}`, { type: mime })
      setPendingStickerFiles(prev => [...prev, { id, file }])
    }
    setStickerLayers(prev => [
      ...prev,
      { id, kind: "image", src: saved.src, x: 50, y: 42, size: 72, rotation: 0 },
    ])
    setSelectedStickerId(id)
    setTool("none")
  }

  const currentFilter = FILTERS[filterIdx].css

  const updateSelectedSticker = (patch: { size?: number; rotation?: number }) => {
    if (!selectedStickerId) return
    setStickerLayers(prev => prev.map(layer => (
      layer.id === selectedStickerId ? { ...layer, ...patch } : layer
    )))
  }

  const startStickerRotation = (e: React.PointerEvent, layer: StickerLayer) => {
    e.stopPropagation()
    e.preventDefault()
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const centerX = rect.left + (layer.x / 100) * rect.width
    const centerY = rect.top + (layer.y / 100) * rect.height
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
    rotationDragging.current = {
      id: layer.id,
      startAngle,
      startRotation: "rotation" in layer ? layer.rotation : 0,
      centerX,
      centerY,
    }
    dragging.current = null
    setSelectedStickerId(layer.id)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

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
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedStickerId(null)
          }}
        >
          {/* Media */}
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaSrc || undefined}
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
            <img src={mediaSrc || undefined} alt=""
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
          {stickerLayers.map(layer => {
            const isSelected = selectedStickerId === layer.id
            const rotation = "rotation" in layer ? layer.rotation : 0
            return (
              <div
                key={layer.id}
                className="absolute cursor-grab active:cursor-grabbing touch-none"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  zIndex: isSelected ? 20 : 8,
                }}
                onPointerDown={e => onPointerDown(e, layer.id, "sticker")}
                onClick={() => setSelectedStickerId(layer.id)}
              >
                {layer.kind === "emoji" ? (
                  <span style={{ fontSize: layer.size }} className="select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                    {layer.emoji}
                  </span>
                ) : layer.kind === "location" ? (
                  <div
                    className="inline-flex max-w-[250px] items-center gap-2 rounded-[22px] border border-white/15 bg-[rgba(10,10,16,0.75)] px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                    title={layer.text}
                  >
                    <div className={`relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br ${getLocationStickerTone(layer.text)} text-white shadow-[0_10px_25px_rgba(0,0,0,0.35)]`}>
                      <MapPin size={15} />
                      <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-white/90 ring-2 ring-black/35" />
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/55">
                        Ubicación
                      </span>
                      <span
                        className="select-none overflow-hidden text-ellipsis whitespace-nowrap font-black uppercase tracking-wide text-white"
                        style={{ fontSize: Math.max(11, Math.min(layer.size, 15)) }}
                      >
                        {getShortLocationLabel(layer.text)}
                      </span>
                    </div>
                    <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/70">
                      <span className="text-[10px] font-black">›</span>
                    </div>
                  </div>
                ) : layer.kind === "video" ? (
                  <video
                    src={layer.src}
                    autoPlay
                    loop
                    playsInline
                    className="select-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] rounded-lg"
                    style={{ width: layer.size * 1.4, height: "auto", maxHeight: layer.size * 2.5 }}
                    draggable={false}
                  />
                ) : (
                  <img
                    src={layer.src}
                    alt="Sticker"
                    className="select-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
                    style={{ width: layer.size * 1.4, height: "auto" }}
                    draggable={false}
                  />
                )}

                {isSelected && (<>
                  {/* Selection ring */}
                  <div className="absolute inset-0 pointer-events-none rounded-xl"
                    style={{ margin: -3, border: "1.5px solid rgba(255,255,255,0.55)", boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }} />

                  {/* ✕ delete — top-left */}
                  <button
                    type="button"
                    className="absolute -top-3 -left-3 w-6 h-6 rounded-full flex items-center justify-center z-30 shadow-md"
                    style={{ background: "rgba(20,20,30,0.92)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation()
                      setStickerLayers(prev => prev.filter(l => l.id !== layer.id))
                      setPendingStickerFiles(prev => prev.filter(f => f.id !== layer.id))
                      setSelectedStickerId(null)
                    }}
                  >
                    <X size={11} className="text-white/80" />
                  </button>

                  {/* − scale — bottom-left */}
                  <button
                    type="button"
                    className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full flex items-center justify-center z-30 shadow-md text-white/80 text-sm font-bold"
                    style={{ background: "rgba(20,20,30,0.92)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); updateSelectedSticker({ size: Math.max(18, Math.round(layer.size * 0.85)) }) }}
                  >−</button>

                  {/* + scale — bottom-right */}
                  <button
                    type="button"
                    className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-30 shadow-md text-white/80 text-sm font-bold"
                    style={{ background: "rgba(20,20,30,0.92)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); updateSelectedSticker({ size: Math.min(220, Math.round(layer.size * 1.15)) }) }}
                  >+</button>

                  {/* ↻ rotate — top-right, draggable */}
                  <button
                    type="button"
                    className="absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-30 shadow-md touch-none"
                    style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", border: "1px solid rgba(255,255,255,0.2)" }}
                    onPointerDown={e => startStickerRotation(e, layer)}
                  >
                    <span className="text-white text-[11px] font-bold leading-none">↻</span>
                  </button>
                </>)}
              </div>
            )
          })}

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
              onClick={() => { preloadTracks(apiTracks, 4); setShowMusicModal(true) }}
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
        <div className="relative z-10 border-t border-white/5 bg-black/95">
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
                    ? <video src={mediaSrc || undefined} className="h-full w-full object-cover" style={{ filter: f.css }} muted playsInline />
                    : <img src={mediaSrc || undefined} className="h-full w-full object-cover" style={{ filter: f.css }} alt={f.name} />
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
            onClick={() => onPublish(file, "", appliedMusic ?? undefined, currentFilter, textLayers, stickerLayers, location || undefined, pendingStickerFiles)}
            disabled={isUploading}
            className="flex items-center gap-2 h-12 px-7 rounded-full font-bold text-white text-sm bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/30 disabled:opacity-50"
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
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="absolute bottom-28 inset-x-0 z-30 px-4"
            >
              <div className="flex h-[62vh] min-h-[420px] max-h-[540px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#07070d]/95 backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.55)]">
                <div className="flex items-center justify-between px-4 pt-4">
                  <div>
                    <h3 className="text-white text-sm font-semibold">Stickers</h3>
                    <p className="text-white/35 text-[11px]">Agrega emojis, ubicación y tus stickers propios</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => videoStickerInputRef.current?.click()}
                      className="h-8 px-3 rounded-full bg-white/8 border border-white/10 flex items-center gap-1.5 text-white/80 text-[11px] font-semibold hover:bg-white/12 transition-colors"
                    >
                      <span className="text-xs">🎬</span>
                      Video
                    </button>
                    <button
                      onClick={() => stickerFileInputRef.current?.click()}
                      className="h-8 px-3 rounded-full bg-white/8 border border-white/10 flex items-center gap-1.5 text-white/80 text-[11px] font-semibold hover:bg-white/12 transition-colors"
                    >
                      <span className="text-xs">＋</span>
                      Subir
                    </button>
                    <button
                      onClick={() => setTool("none")}
                      className="h-8 w-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 px-4 mt-8 pt-5">
                  {[
                    { id: "featured", label: "Destacados", icon: Sparkles },
                    { id: "emoji", label: "Emoji", icon: Smile },
                    { id: "my", label: "Mis Stickers", icon: Images },
                    { id: "location", label: "Ubicación", icon: MapPin },
                  ].map(tab => {
                    const Icon = tab.icon
                    const active = stickerTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setStickerTab(tab.id as typeof stickerTab)
                          if (tab.id === "location") {
                            setLocationDraft(location || locationDraft)
                          }
                        }}
                        className={`h-8 w-full min-w-0 px-3 flex items-center justify-center gap-1.5 rounded-full border text-[11px] font-semibold transition-all leading-none ${
                          active
                            ? "bg-white text-black border-white"
                            : "bg-white/5 text-white/70 border-white/10"
                        }`}
                      >
                        <Icon size={12} />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 mt-4">
                  {stickerTab === "featured" && (
                    <div className="grid grid-cols-2 gap-2">
                      {FEATURED_STICKERS.map(item => (
                        item.kind === "location" ? (
                          <button
                            key={item.label}
                            onClick={() => {
                              setStickerTab("location")
                              setLocationDraft(location || locationDraft)
                            }}
                            className="group rounded-2xl border border-pink-400/20 bg-gradient-to-br from-pink-500/15 via-white/5 to-orange-400/10 p-2.5 text-left transition-all hover:border-pink-300/40 hover:bg-pink-500/18"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
                                <MapPin size={15} className="text-pink-300" />
                              </div>
                              <span className="text-[10px] text-pink-300/80 font-semibold">Sticker</span>
                            </div>
                            <p className="mt-2.5 text-white text-[13px] font-semibold">{item.label}</p>
                            <p className="text-white/35 text-[10px] mt-1">{item.description}</p>
                          </button>
                        ) : (
                          <button
                            key={item.label}
                            onClick={() => item.emoji && addSticker(item.emoji)}
                            className="group rounded-2xl border border-white/10 bg-white/5 p-2.5 text-left transition-all hover:border-cyan-400/30 hover:bg-cyan-400/10"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xl">{item.emoji}</span>
                              <span className="text-[10px] text-white/30 font-semibold">Añadir</span>
                            </div>
                            <p className="mt-2.5 text-white text-[13px] font-semibold">{item.label}</p>
                            <p className="text-white/35 text-[10px] mt-1">{item.description}</p>
                          </button>
                        )
                      ))}
                    </div>
                  )}

                  {stickerTab === "emoji" && (
                    <div className="space-y-3">
                      {STICKER_ROWS.map((row, ri) => (
                        <div key={ri} className="grid grid-cols-8 gap-1.5">
                          {row.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => addSticker(emoji)}
                              className="aspect-square rounded-2xl bg-white/5 border border-white/10 text-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/10"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {stickerTab === "my" && (
                    <div className="space-y-3">
                      {myStickers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Images size={32} className="text-white/20" />
                          <p className="text-white/40 text-sm font-semibold">No tienes stickers guardados</p>
                          <p className="text-white/25 text-xs">Sube una imagen con el botón "Subir" y se guardará aquí</p>
                          <button
                            onClick={() => stickerFileInputRef.current?.click()}
                            className="px-4 py-2 rounded-full bg-white/8 border border-white/10 text-white/70 text-xs font-semibold hover:bg-white/12"
                          >
                            Subir sticker
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {myStickers.map(s => (
                            <button
                              key={s.id}
                              onClick={() => addStickerFromSaved(s)}
                              className="aspect-square rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center hover:border-cyan-400/40 hover:bg-cyan-400/8 transition-all active:scale-95"
                            >
                              <img src={s.src} alt={s.name} className="w-full h-full object-contain p-1" draggable={false} />
                            </button>
                          ))}
                          <button
                            onClick={() => stickerFileInputRef.current?.click()}
                            className="aspect-square rounded-2xl border-2 border-dashed border-white/15 flex items-center justify-center text-white/30 hover:border-white/30 hover:text-white/50 transition-all"
                          >
                            <span className="text-2xl font-light">＋</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {stickerTab === "location" && (
                    <div className="space-y-3">
                      <div className="rounded-3xl border border-pink-400/20 bg-gradient-to-br from-pink-500/18 via-white/6 to-orange-400/12 p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center">
                            <MapPin size={17} className="text-pink-300" />
                          </div>
                          <div>
                            <p className="text-white text-[13px] font-semibold">Sticker de ubicación</p>
                            <p className="text-white/45 text-[11px]">Se verá encima de la historia, como en Instagram o TikTok</p>
                          </div>
                        </div>
                        <div className="relative mt-3">
                          <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300/80 pointer-events-none" />
                          {isMapsLoaded ? (
                            <Autocomplete
                              onLoad={onLoadLocationAutocomplete}
                              onPlaceChanged={onPlaceChanged}
                            >
                              <input
                                ref={locationInputRef}
                                autoFocus
                                value={locationDraft}
                                onChange={e => setLocationDraft(e.target.value)}
                                placeholder="Busca una ubicación"
                                className="w-full rounded-2xl bg-black/30 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/28 focus:outline-none focus:border-pink-400/40"
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    e.preventDefault()
                                    addLocationSticker(locationDraft)
                                  }
                                }}
                              />
                            </Autocomplete>
                          ) : (
                            <input
                              ref={locationInputRef}
                              autoFocus
                              value={locationDraft}
                              onChange={e => setLocationDraft(e.target.value)}
                              placeholder="Busca una ubicación"
                              className="w-full rounded-2xl bg-black/30 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/28 focus:outline-none focus:border-pink-400/40"
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  addLocationSticker(locationDraft)
                                }
                              }}
                            />
                          )}
                        </div>
                        <p className="mt-2 text-[10px] text-white/30">
                          {isMapsLoaded ? "Powered by Google" : "Cargando sugerencias de Google..."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {LOCATION_SUGGESTIONS.map(s => (
                          <button
                            key={s}
                            onClick={() => addLocationSticker(s)}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-[11px] hover:bg-pink-500/15 hover:text-pink-200 hover:border-pink-400/30 transition-all"
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2.5">
                        {location && (
                          <button
                            onClick={() => {
                              setLocation("")
                              setLocationDraft("")
                              setStickerLayers(prev => prev.filter(layer => layer.kind !== "location"))
                            }}
                            className="flex-1 py-2.5 rounded-2xl bg-white/6 border border-white/10 text-white/55 text-xs font-semibold"
                          >
                            Quitar ubicación
                          </button>
                        )}
                        <button
                          onClick={() => addLocationSticker(locationDraft)}
                          className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xs font-bold shadow-lg shadow-pink-500/25"
                        >
                          Agregar sticker
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={stickerFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) addImageStickerFromFile(file)
            e.currentTarget.value = ""
          }}
        />
        <input
          ref={videoStickerInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) addVideoStickerFromFile(file)
            e.currentTarget.value = ""
          }}
        />

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
      <MusicSelectorModal
        isOpen={showMusicModal}
        onClose={() => {
          audioControls.stopAll()
          audioControls.clearTrack()
          setAppliedMusic(null)
          setShowMusicModal(false)
        }}
        onApply={(res) => {
          audioControls.stopAll()
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
    </>
  )
}
