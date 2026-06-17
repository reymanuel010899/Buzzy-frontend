"use client"

import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, Image, Film } from "lucide-react"
import { pickMedia } from "../../../hooks/useMediaPicker"

export interface StickerItem {
  id: string
  emoji: string
  label: string
  category: "popular" | "emoji" | "neon" | "text" | "ui" | "gif"
}

export interface StickerOverlayData {
  id: string
  stickerId: string
  emoji: string
  kind?: "emoji" | "image" | "video"
  src?: string
  x: number
  y: number
  scale: number
  rotation: number
  startTime: number
  endTime: number
}

// ── Sticker catalogue ─────────────────────────────────────────────────────────

const ALL_STICKERS: StickerItem[] = [
  // ── Popular ──
  { id: "p01", emoji: "🔥", label: "Fuego",       category: "popular" },
  { id: "p02", emoji: "⚡", label: "Rayo",        category: "popular" },
  { id: "p03", emoji: "✨", label: "Destellos",   category: "popular" },
  { id: "p04", emoji: "💫", label: "Giro",        category: "popular" },
  { id: "p05", emoji: "🎯", label: "Target",      category: "popular" },
  { id: "p06", emoji: "🚀", label: "Cohete",      category: "popular" },
  { id: "p07", emoji: "💥", label: "Explosión",   category: "popular" },
  { id: "p08", emoji: "🌊", label: "Ola",         category: "popular" },
  { id: "p09", emoji: "🌟", label: "Estrella",    category: "popular" },
  { id: "p10", emoji: "🎉", label: "Confeti",     category: "popular" },
  { id: "p11", emoji: "💎", label: "Diamante",    category: "popular" },
  { id: "p12", emoji: "🏄", label: "Surf",        category: "popular" },
  { id: "p13", emoji: "🎶", label: "Música",      category: "popular" },
  { id: "p14", emoji: "👑", label: "Corona",      category: "popular" },
  { id: "p15", emoji: "🦋", label: "Mariposa",    category: "popular" },
  { id: "p16", emoji: "🌈", label: "Arcoíris",    category: "popular" },
  { id: "p17", emoji: "🍀", label: "Trébol",      category: "popular" },
  { id: "p18", emoji: "⚽", label: "Balón",       category: "popular" },
  { id: "p19", emoji: "🎸", label: "Guitarra",    category: "popular" },
  { id: "p20", emoji: "🌙", label: "Luna",        category: "popular" },

  // ── Emoji ──
  { id: "e01", emoji: "😂", label: "LOL",         category: "emoji" },
  { id: "e02", emoji: "😍", label: "Amor",        category: "emoji" },
  { id: "e03", emoji: "🤯", label: "Mente",       category: "emoji" },
  { id: "e04", emoji: "😎", label: "Cool",        category: "emoji" },
  { id: "e05", emoji: "🥶", label: "Frío",        category: "emoji" },
  { id: "e06", emoji: "🤙", label: "OK",          category: "emoji" },
  { id: "e07", emoji: "👁️",  label: "Ojo",        category: "emoji" },
  { id: "e08", emoji: "💀", label: "Skull",       category: "emoji" },
  { id: "e09", emoji: "🫠", label: "Derretido",   category: "emoji" },
  { id: "e10", emoji: "🥹", label: "Ternura",     category: "emoji" },
  { id: "e11", emoji: "😤", label: "Furioso",     category: "emoji" },
  { id: "e12", emoji: "🤌", label: "Perfecto",    category: "emoji" },
  { id: "e13", emoji: "😈", label: "Diablo",      category: "emoji" },
  { id: "e14", emoji: "🤡", label: "Payaso",      category: "emoji" },
  { id: "e15", emoji: "👻", label: "Fantasma",    category: "emoji" },
  { id: "e16", emoji: "🫶", label: "Cariño",      category: "emoji" },
  { id: "e17", emoji: "🙈", label: "Mono",        category: "emoji" },
  { id: "e18", emoji: "💩", label: "Poop",        category: "emoji" },
  { id: "e19", emoji: "🤷", label: "No sé",       category: "emoji" },
  { id: "e20", emoji: "🫡", label: "Saludo",      category: "emoji" },
  { id: "e21", emoji: "🥴", label: "Mareado",     category: "emoji" },
  { id: "e22", emoji: "🤫", label: "Silencio",    category: "emoji" },
  { id: "e23", emoji: "😏", label: "Smirk",       category: "emoji" },
  { id: "e24", emoji: "🧠", label: "Cerebro",     category: "emoji" },

  // ── Neon / Futurista ──
  { id: "n01", emoji: "🔮", label: "Bola",        category: "neon" },
  { id: "n02", emoji: "🌐", label: "Red",         category: "neon" },
  { id: "n03", emoji: "💠", label: "Gema",        category: "neon" },
  { id: "n04", emoji: "🔷", label: "Azul",        category: "neon" },
  { id: "n05", emoji: "🛸", label: "OVNI",        category: "neon" },
  { id: "n06", emoji: "👾", label: "Alien",       category: "neon" },
  { id: "n07", emoji: "🤖", label: "Robot",       category: "neon" },
  { id: "n08", emoji: "🧬", label: "ADN",         category: "neon" },
  { id: "n09", emoji: "⚛️",  label: "Átomo",      category: "neon" },
  { id: "n10", emoji: "🔬", label: "Ciencia",     category: "neon" },
  { id: "n11", emoji: "💡", label: "Idea",        category: "neon" },
  { id: "n12", emoji: "🌌", label: "Galaxia",     category: "neon" },
  { id: "n13", emoji: "☄️",  label: "Cometa",     category: "neon" },
  { id: "n14", emoji: "🔋", label: "Energía",     category: "neon" },
  { id: "n15", emoji: "📶", label: "Señal",       category: "neon" },
  { id: "n16", emoji: "🕹️",  label: "Joystick",   category: "neon" },
  { id: "n17", emoji: "💻", label: "PC",          category: "neon" },
  { id: "n18", emoji: "🖥️",  label: "Monitor",    category: "neon" },
  { id: "n19", emoji: "🔌", label: "Plug",        category: "neon" },
  { id: "n20", emoji: "📱", label: "Móvil",       category: "neon" },
  { id: "n21", emoji: "🌀", label: "Vórtice",     category: "neon" },
  { id: "n22", emoji: "🧿", label: "Ojo azul",    category: "neon" },
  { id: "n23", emoji: "🔯", label: "Estrella 6",  category: "neon" },
  { id: "n24", emoji: "🪩", label: "Disco",       category: "neon" },

  // ── Texto / Badges ──
  { id: "t01", emoji: "🆒", label: "COOL",        category: "text" },
  { id: "t02", emoji: "🆕", label: "NEW",         category: "text" },
  { id: "t03", emoji: "🔝", label: "TOP",         category: "text" },
  { id: "t04", emoji: "💯", label: "100%",        category: "text" },
  { id: "t05", emoji: "🏆", label: "Win",         category: "text" },
  { id: "t06", emoji: "🥇", label: "#1",          category: "text" },
  { id: "t07", emoji: "🎊", label: "Party",       category: "text" },
  { id: "t08", emoji: "🆓", label: "FREE",        category: "text" },
  { id: "t09", emoji: "🆙", label: "UP",          category: "text" },
  { id: "t10", emoji: "🅱️",  label: "B",          category: "text" },
  { id: "t11", emoji: "🔞", label: "+18",         category: "text" },
  { id: "t12", emoji: "🚫", label: "NO",          category: "text" },
  { id: "t13", emoji: "✅", label: "OK",          category: "text" },
  { id: "t14", emoji: "❌", label: "X",           category: "text" },
  { id: "t15", emoji: "⚠️",  label: "Alerta",     category: "text" },
  { id: "t16", emoji: "📢", label: "Anuncio",     category: "text" },

  // ── Drones / UI ──
  { id: "u01", emoji: "🎥", label: "REC",         category: "ui" },
  { id: "u02", emoji: "📡", label: "Antena",      category: "ui" },
  { id: "u03", emoji: "🛰️",  label: "Satélite",   category: "ui" },
  { id: "u04", emoji: "🔴", label: "Live",        category: "ui" },
  { id: "u05", emoji: "📍", label: "Pin",         category: "ui" },
  { id: "u06", emoji: "🧭", label: "Brújula",     category: "ui" },
  { id: "u07", emoji: "🔁", label: "Loop",        category: "ui" },
  { id: "u08", emoji: "🚁", label: "Helicóptero", category: "ui" },
  { id: "u09", emoji: "✈️",  label: "Avión",      category: "ui" },
  { id: "u10", emoji: "🛩️",  label: "Drone",      category: "ui" },
  { id: "u11", emoji: "🗺️",  label: "Mapa",       category: "ui" },
  { id: "u12", emoji: "🏔️",  label: "Montaña",    category: "ui" },
  { id: "u13", emoji: "🌄", label: "Amanecer",    category: "ui" },
  { id: "u14", emoji: "🌃", label: "Ciudad",      category: "ui" },
  { id: "u15", emoji: "🏙️",  label: "Skyline",    category: "ui" },
  { id: "u16", emoji: "🌅", label: "Atardecer",   category: "ui" },
  { id: "u17", emoji: "🎬", label: "Claqueta",    category: "ui" },
  { id: "u18", emoji: "📸", label: "Cámara",      category: "ui" },
  { id: "u19", emoji: "🎞️",  label: "Film",       category: "ui" },
  { id: "u20", emoji: "🎦", label: "Cinema",      category: "ui" },

  // ── GIF / Animado (placeholders visuales) ──
  { id: "g01", emoji: "🌊", label: "Wave",        category: "gif" },
  { id: "g02", emoji: "🎆", label: "Fuegos",      category: "gif" },
  { id: "g03", emoji: "🎇", label: "Sparkle",     category: "gif" },
  { id: "g04", emoji: "🌪️",  label: "Tornado",    category: "gif" },
  { id: "g05", emoji: "⚡", label: "Thunder",     category: "gif" },
  { id: "g06", emoji: "🌠", label: "Shooting ★",  category: "gif" },
  { id: "g07", emoji: "💦", label: "Water",       category: "gif" },
  { id: "g08", emoji: "🔥", label: "Fire",        category: "gif" },
  { id: "g09", emoji: "❄️",  label: "Nieve",      category: "gif" },
  { id: "g10", emoji: "🌬️",  label: "Viento",     category: "gif" },
  { id: "g11", emoji: "🌧️",  label: "Lluvia",     category: "gif" },
  { id: "g12", emoji: "🎊", label: "Confetti",    category: "gif" },
]

type Category = "popular" | "emoji" | "neon" | "text" | "ui" | "gif"

const TABS: { key: Category; label: string }[] = [
  { key: "popular", label: "🔥 Popular" },
  { key: "emoji",   label: "😂 Emoji" },
  { key: "neon",    label: "🔮 Neon" },
  { key: "text",    label: "🆒 Texto" },
  { key: "ui",      label: "🎥 Drone" },
  { key: "gif",     label: "✨ GIF" },
]

interface StickerPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectSticker: (sticker: StickerItem) => void
  onSelectImageFile?: (file: File) => void
  onSelectVideoFile?: (file: File) => void
}

const StickerPanel: React.FC<StickerPanelProps> = ({ isOpen, onClose, onSelectSticker, onSelectImageFile, onSelectVideoFile }) => {
  const [activeCategory, setActiveCategory] = useState<Category>("popular")
  const [query, setQuery] = useState("")
  // Selectores nativos (Capacitor) — en el celular abren la galería/cámara nativa
  // en vez del input web crudo, que en Android no abre el selector correctamente.
  const handlePickImage = async () => {
    const picked = await pickMedia("image", 50)
    if (picked && onSelectImageFile) { onSelectImageFile(picked.file); onClose() }
  }
  const handlePickVideo = async () => {
    const picked = await pickMedia("video", 50)
    if (picked && onSelectVideoFile) { onSelectVideoFile(picked.file); onClose() }
  }

  const filtered = useMemo(() => {
    if (query.trim()) {
      return ALL_STICKERS.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase()) ||
        s.emoji.includes(query)
      )
    }
    return ALL_STICKERS.filter(s => s.category === activeCategory)
  }, [activeCategory, query])

  const handleSelect = (sticker: StickerItem) => {
    onSelectSticker(sticker)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sticker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/40"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="sticker-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-[#0f0f1a] border-t border-white/10 overflow-hidden flex flex-col"
            style={{ height: "62%" }}
          >
            {/* Handle — tap to close */}
            <div className="flex justify-center pt-2.5 pb-2 shrink-0 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1 rounded-full bg-white/30 active:bg-white/60 transition-colors" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 shrink-0">
              <h3 className="text-white font-semibold text-sm">Stickers</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePickImage}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/8 border border-white/10 text-white/70 text-[11px] font-semibold hover:bg-white/12 transition-colors"
                >
                  <Image size={12} />
                  Imagen
                </button>
                <button
                  onClick={handlePickVideo}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/8 border border-white/10 text-white/70 text-[11px] font-semibold hover:bg-white/12 transition-colors"
                >
                  <Film size={12} />
                  Video
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 pb-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <Search size={12} className="text-white/40 shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar sticker…"
                  className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/30"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-white/40 hover:text-white">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            {!query && (
              <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide shrink-0">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveCategory(tab.key)}
                    className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap ${
                      activeCategory === tab.key
                        ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-sm"
                        : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/8"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* GIF notice */}
            {activeCategory === "gif" && !query && (
              <div className="mx-4 mb-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
                <p className="text-[10px] text-purple-300 text-center">
                  Integración GIPHY próximamente · Estos son placeholders animados
                </p>
              </div>
            )}

            {/* Sticker Grid */}
            <div className="flex-1 overflow-y-auto px-4 min-h-0">
              <div className="grid grid-cols-5 gap-1.5 pb-4">
                {filtered.map((sticker, i) => (
                  <motion.button
                    key={sticker.id}
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.01 }}
                    onClick={() => handleSelect(sticker)}
                    className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/40 hover:bg-white/10 transition-all active:scale-90"
                  >
                    <span className="text-2xl leading-none">{sticker.emoji}</span>
                    <span className="text-[8px] text-gray-500 truncate w-full text-center leading-tight">{sticker.label}</span>
                  </motion.button>
                ))}

                {filtered.length === 0 && (
                  <div className="col-span-5 flex flex-col items-center justify-center py-8 text-white/30">
                    <span className="text-3xl mb-2">🔍</span>
                    <span className="text-xs">Sin resultados</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default StickerPanel
