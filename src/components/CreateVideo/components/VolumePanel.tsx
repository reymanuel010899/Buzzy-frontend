"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Volume2, VolumeX } from "lucide-react"

interface VolumePanelProps {
  isOpen: boolean
  onClose: () => void
  volumeOriginal: number   // 0–100
  onSetVolumeOriginal: (v: number) => void
}

const VolumePanel: React.FC<VolumePanelProps> = ({
  isOpen, onClose,
  volumeOriginal, onSetVolumeOriginal,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="volume-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="absolute inset-x-0 bottom-0 z-50 bg-[#0f0f1a]/95 backdrop-blur-xl rounded-t-2xl border-t border-white/10 p-5 pb-8"
        >
          {/* Handle — tap to close */}
          <div className="flex justify-center cursor-pointer mb-4" onClick={onClose}>
            <div className="w-10 h-1 rounded-full bg-white/30 active:bg-white/60 transition-colors" />
          </div>

          {/* Header */}
          <div className="flex items-center mb-6">
            <span className="text-white font-semibold text-base">Volumen del video</span>
          </div>

          {/* Icono + valor */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center mb-3">
              {volumeOriginal === 0
                ? <VolumeX size={28} className="text-white" />
                : <Volume2 size={28} className="text-white" />
              }
            </div>
            <span className="text-white text-3xl font-bold">{Math.round(volumeOriginal * 100)}%</span>
            <span className="text-white/40 text-xs mt-1">
              {volumeOriginal === 0 ? "Silenciado" : volumeOriginal < 0.4 ? "Bajo" : volumeOriginal < 0.75 ? "Medio" : "Alto"}
            </span>
          </div>

          {/* Slider */}
          <div className="relative h-3 bg-white/10 rounded-full mb-4">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
              style={{ width: `${volumeOriginal * 100}%` }}
            />
            {/* Thumb visual */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg shadow-blue-500/50 pointer-events-none transition-all"
              style={{ left: `calc(${volumeOriginal * 100}% - 10px)` }}
            />
            <input
              type="range"
              min={0} max={100} step={1}
              value={Math.round(volumeOriginal * 100)}
              onChange={e => onSetVolumeOriginal(Number(e.target.value) / 100)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            />
          </div>

          {/* Accesos rápidos */}
          <div className="flex gap-2 mt-4">
            {[0, 25, 50, 75, 100].map(v => (
              <button
                key={v}
                onClick={() => onSetVolumeOriginal(v / 100)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  Math.round(volumeOriginal * 100) === v
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {v}%
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default VolumePanel
