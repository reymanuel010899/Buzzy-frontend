"use client"

import React, { useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"

/* ─────────────────────────────────────────────────────────────────
   FILTER DEFINITIONS
   Each filter is a CSS filter string applied directly to the video.
   This is exactly how Instagram/TikTok do it — GPU-accelerated,
   zero canvas overhead, real-time on any device.
───────────────────────────────────────────────────────────────── */
export interface VideoFilter {
  id: string
  label: string
  css: string          // applied to <video> element
  thumbnail: string    // CSS filter for the thumbnail preview swatch
}

export const VIDEO_FILTERS: VideoFilter[] = [
  {
    id: "none",
    label: "Original",
    css: "none",
    thumbnail: "none",
  },
  {
    id: "clarendon",
    label: "Clarendon",
    css: "contrast(1.2) saturate(1.35) brightness(1.05)",
    thumbnail: "contrast(1.2) saturate(1.35) brightness(1.05)",
  },
  {
    id: "gingham",
    label: "Gingham",
    css: "brightness(1.05) hue-rotate(350deg) saturate(0.9) sepia(0.08)",
    thumbnail: "brightness(1.05) hue-rotate(350deg) saturate(0.9) sepia(0.08)",
  },
  {
    id: "moon",
    label: "Moon",
    css: "grayscale(1) contrast(1.1) brightness(1.1)",
    thumbnail: "grayscale(1) contrast(1.1) brightness(1.1)",
  },
  {
    id: "lark",
    label: "Lark",
    css: "contrast(0.9) brightness(1.1) saturate(1.4) hue-rotate(5deg)",
    thumbnail: "contrast(0.9) brightness(1.1) saturate(1.4) hue-rotate(5deg)",
  },
  {
    id: "reyes",
    label: "Reyes",
    css: "sepia(0.22) contrast(0.85) brightness(1.1) saturate(0.75)",
    thumbnail: "sepia(0.22) contrast(0.85) brightness(1.1) saturate(0.75)",
  },
  {
    id: "juno",
    label: "Juno",
    css: "saturate(1.4) contrast(1.1) sepia(0.1) hue-rotate(350deg)",
    thumbnail: "saturate(1.4) contrast(1.1) sepia(0.1) hue-rotate(350deg)",
  },
  {
    id: "slumber",
    label: "Slumber",
    css: "saturate(0.66) brightness(1.05) sepia(0.18)",
    thumbnail: "saturate(0.66) brightness(1.05) sepia(0.18)",
  },
  {
    id: "crema",
    label: "Crema",
    css: "sepia(0.15) contrast(0.85) saturate(0.75) brightness(1.05) hue-rotate(5deg)",
    thumbnail: "sepia(0.15) contrast(0.85) saturate(0.75) brightness(1.05) hue-rotate(5deg)",
  },
  {
    id: "ludwig",
    label: "Ludwig",
    css: "contrast(1.05) sepia(0.08) brightness(1.05) saturate(1.1)",
    thumbnail: "contrast(1.05) sepia(0.08) brightness(1.05) saturate(1.1)",
  },
  {
    id: "aden",
    label: "Aden",
    css: "hue-rotate(20deg) contrast(0.9) saturate(0.85) brightness(1.2) sepia(0.15)",
    thumbnail: "hue-rotate(20deg) contrast(0.9) saturate(0.85) brightness(1.2) sepia(0.15)",
  },
  {
    id: "perpetua",
    label: "Perpetua",
    css: "contrast(1.1) saturate(1.1) brightness(1.05) hue-rotate(355deg) sepia(0.05)",
    thumbnail: "contrast(1.1) saturate(1.1) brightness(1.05) hue-rotate(355deg) sepia(0.05)",
  },
  {
    id: "amaro",
    label: "Amaro",
    css: "hue-rotate(10deg) contrast(0.9) brightness(1.1) saturate(1.5)",
    thumbnail: "hue-rotate(10deg) contrast(0.9) brightness(1.1) saturate(1.5)",
  },
  {
    id: "mayfair",
    label: "Mayfair",
    css: "contrast(1.1) saturate(1.1) brightness(1.1) sepia(0.1) hue-rotate(355deg)",
    thumbnail: "contrast(1.1) saturate(1.1) brightness(1.1) sepia(0.1) hue-rotate(355deg)",
  },
  {
    id: "rise",
    label: "Rise",
    css: "brightness(1.05) sepia(0.2) saturate(1.4) contrast(0.9) hue-rotate(350deg)",
    thumbnail: "brightness(1.05) sepia(0.2) saturate(1.4) contrast(0.9) hue-rotate(350deg)",
  },
  {
    id: "hudson",
    label: "Hudson",
    css: "brightness(1.2) contrast(0.9) saturate(1.1) hue-rotate(200deg) sepia(0.05)",
    thumbnail: "brightness(1.2) contrast(0.9) saturate(1.1) hue-rotate(200deg) sepia(0.05)",
  },
  {
    id: "valencia",
    label: "Valencia",
    css: "sepia(0.15) saturate(1.5) contrast(1.08) brightness(1.08) hue-rotate(3deg)",
    thumbnail: "sepia(0.15) saturate(1.5) contrast(1.08) brightness(1.08) hue-rotate(3deg)",
  },
  {
    id: "xpro2",
    label: "X-Pro II",
    css: "sepia(0.3) saturate(1.4) contrast(1.2) brightness(0.9) hue-rotate(10deg)",
    thumbnail: "sepia(0.3) saturate(1.4) contrast(1.2) brightness(0.9) hue-rotate(10deg)",
  },
  {
    id: "sierra",
    label: "Sierra",
    css: "sepia(0.25) contrast(1.5) brightness(0.9) hue-rotate(5deg)",
    thumbnail: "sepia(0.25) contrast(1.5) brightness(0.9) hue-rotate(5deg)",
  },
  {
    id: "willow",
    label: "Willow",
    css: "grayscale(0.5) contrast(0.95) brightness(0.9) sepia(0.2)",
    thumbnail: "grayscale(0.5) contrast(0.95) brightness(0.9) sepia(0.2)",
  },
  {
    id: "lofi",
    label: "Lo-Fi",
    css: "saturate(1.4) contrast(1.3) brightness(0.9)",
    thumbnail: "saturate(1.4) contrast(1.3) brightness(0.9)",
  },
  {
    id: "inkwell",
    label: "Inkwell",
    css: "grayscale(1) brightness(1.05) contrast(1.1) sepia(0.05)",
    thumbnail: "grayscale(1) brightness(1.05) contrast(1.1) sepia(0.05)",
  },
  {
    id: "hefe",
    label: "Hefe",
    css: "sepia(0.4) contrast(1.5) brightness(0.9) saturate(1.4)",
    thumbnail: "sepia(0.4) contrast(1.5) brightness(0.9) saturate(1.4)",
  },
  {
    id: "nashville",
    label: "Nashville",
    css: "sepia(0.25) contrast(1.5) brightness(1.05) saturate(1.2) hue-rotate(340deg)",
    thumbnail: "sepia(0.25) contrast(1.5) brightness(1.05) saturate(1.2) hue-rotate(340deg)",
  },
]

/* ─────────────────────────────────────────────────────────────────
   THUMBNAIL SWATCH
   Draws a single frame of the video into a canvas and applies
   the CSS filter so the user sees a real preview of their video
───────────────────────────────────────────────────────────────── */
const FilterSwatch: React.FC<{
  filter: VideoFilter
  videoRef: React.RefObject<HTMLVideoElement>
  isSelected: boolean
  onClick: () => void
}> = ({ filter, videoRef, isSelected, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      ctx.filter = filter.css === "none" ? "none" : filter.css
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    }

    // Draw immediately if video has data, otherwise wait
    if (video.readyState >= 2) {
      draw()
    } else {
      video.addEventListener("loadeddata", draw, { once: true })
    }

    // Re-draw whenever the video seeks (so we always show the current frame)
    video.addEventListener("seeked", draw)
    return () => video.removeEventListener("seeked", draw)
  }, [filter, videoRef])

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div className={`relative rounded-xl overflow-hidden transition-all duration-150 ${
        isSelected
          ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a12]"
          : "ring-1 ring-white/10"
      }`}
        style={{ width: 64, height: 80 }}
      >
        <canvas
          ref={canvasRef}
          width={64}
          height={80}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        {isSelected && (
          <div className="absolute inset-0 flex items-end justify-end p-1 pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
              <Check size={9} className="text-black font-bold" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>
      <span className={`text-[9px] font-medium truncate w-16 text-center transition-colors ${
        isSelected ? "text-cyan-400" : "text-gray-400"
      }`}>
        {filter.label}
      </span>
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────────────
   MAIN PANEL
───────────────────────────────────────────────────────────────── */
interface VideoFilterPanelProps {
  isOpen: boolean
  onClose: () => void
  videoRef: React.RefObject<HTMLVideoElement>
  activeFilterId: string
  onSelectFilter: (filter: VideoFilter) => void
}

const VideoFilterPanel: React.FC<VideoFilterPanelProps> = ({
  isOpen, onClose, videoRef, activeFilterId, onSelectFilter,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — tap to close */}
          <motion.div
            key="filter-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40"
            onClick={onClose}
          />
        <motion.div
          key="filter-panel"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0,     opacity: 1 }}
          exit={{   y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="absolute inset-x-0 bottom-0 z-50 bg-[#0e0e1a] rounded-t-3xl border-t border-white/10"
        >
          {/* Drag handle — tap to close */}
          <div className="flex justify-center pt-2.5 pb-1 cursor-pointer" onClick={onClose}>
            <div className="w-9 h-1 rounded-full bg-white/30 hover:bg-white/60 transition-colors" />
          </div>

          {/* Header */}
          <div className="px-5 py-2">
            <span className="text-white font-bold text-sm tracking-wide">Filtros</span>
          </div>

          {/* Filter strip */}
          <div
            className="flex gap-3 px-4 pb-6 pt-1 overflow-x-auto"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {VIDEO_FILTERS.map(filter => (
              <FilterSwatch
                key={filter.id}
                filter={filter}
                videoRef={videoRef}
                isSelected={activeFilterId === filter.id}
                onClick={() => onSelectFilter(filter)}
              />
            ))}
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default VideoFilterPanel
