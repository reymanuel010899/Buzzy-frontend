"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Music, Mic2 } from "lucide-react"

interface MixerPanelProps {
  isOpen: boolean
  onClose: () => void
  volumeOriginal: number   // 0–100
  volumeMusic: number      // 0–100
  onSetVolumeOriginal: (v: number) => void
  onSetVolumeMusic: (v: number) => void
  hasTrack: boolean
}

const MixerPanel: React.FC<MixerPanelProps> = ({
  isOpen, onClose,
  volumeOriginal, volumeMusic,
  onSetVolumeOriginal, onSetVolumeMusic,
  hasTrack,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mixer-panel"
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
            <span className="text-white font-semibold text-base">Mezclar audio</span>
          </div>

          {/* Video original */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center">
                <Mic2 size={14} className="text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Audio del video</span>
              <span className="ml-auto text-cyan-400 text-sm font-bold">{Math.round(volumeOriginal * 100)}%</span>
            </div>
            <div className="relative h-2 bg-white/10 rounded-full">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                style={{ width: `${volumeOriginal * 100}%` }}
              />
              <input
                type="range"
                min={0} max={100} step={1}
                value={Math.round(volumeOriginal * 100)}
                onChange={e => onSetVolumeOriginal(Number(e.target.value) / 100)}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              />
            </div>
          </div>

          {/* Música */}
          <div className={!hasTrack ? "opacity-40 pointer-events-none" : ""}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Music size={14} className="text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Música</span>
              {!hasTrack && (
                <span className="text-white/40 text-xs">(sin pista)</span>
              )}
              <span className="ml-auto text-pink-400 text-sm font-bold">{Math.round(volumeMusic * 100)}%</span>
            </div>
            <div className="relative h-2 bg-white/10 rounded-full">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                style={{ width: `${volumeMusic * 100}%` }}
              />
              <input
                type="range"
                min={0} max={100} step={1}
                value={Math.round(volumeMusic * 100)}
                onChange={e => onSetVolumeMusic(Number(e.target.value) / 100)}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              />
            </div>
          </div>

          {!hasTrack && (
            <p className="text-white/40 text-xs text-center mt-4">
              Añade una pista de música para mezclar los volúmenes
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default MixerPanel
