"use client"

import React, { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Gauge, Clock, ChevronDown } from "lucide-react"

// ── Speed presets ─────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "0.3×", value: 0.3 },
  { label: "0.5×", value: 0.5 },
  { label: "0.75×", value: 0.75 },
  { label: "1×",  value: 1 },
  { label: "1.5×", value: 1.5 },
  { label: "2×",  value: 2 },
  { label: "3×",  value: 3 },
]

// slider range
const MIN_SPEED = 0.1
const MAX_SPEED = 5

function formatDuration(secs: number) {
  if (!isFinite(secs) || secs <= 0) return "0:00"
  const m = Math.floor(secs / 60)
  const s = (secs % 60).toFixed(1)
  return `${m}:${s.padStart(4, "0")}`
}

function speedToColor(speed: number) {
  if (speed < 0.76) return "from-blue-500 to-cyan-400"
  if (speed === 1)   return "from-cyan-500 to-purple-500"
  if (speed < 2)     return "from-purple-500 to-pink-400"
  return "from-orange-500 to-red-400"
}

function speedLabel(speed: number) {
  if (speed < 0.76) return "Cámara lenta"
  if (speed === 1)   return "Normal"
  if (speed < 2)     return "Rápido"
  return "Súper rápido"
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SpeedDurationPanelProps {
  isOpen: boolean
  onClose: () => void
  speed: number
  originalDuration: number          // seconds, video as recorded
  onSpeedChange: (speed: number) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

const SpeedDurationPanel: React.FC<SpeedDurationPanelProps> = ({
  isOpen, onClose, speed, originalDuration, onSpeedChange,
}) => {
  const [localSpeed, setLocalSpeed] = useState(speed)
  const sliderRef = useRef<HTMLDivElement>(null)

  const resultDuration = originalDuration / localSpeed

  // ── Slider drag (pointer events → works on mobile) ─────────────
  const handleSliderPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(e.clientX)
  }, []) // eslint-disable-line

  const handleSliderPointerMove = useCallback((e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    updateFromPointer(e.clientX)
  }, []) // eslint-disable-line

  const updateFromPointer = (clientX: number) => {
    const el = sliderRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    // Map ratio to speed on a log scale so slow motion gets more precision
    const logMin = Math.log(MIN_SPEED)
    const logMax = Math.log(MAX_SPEED)
    const raw = Math.exp(logMin + ratio * (logMax - logMin))
    const snapped = snapToPreset(raw)
    setLocalSpeed(snapped)
    onSpeedChange(snapped)
  }

  // Snap to a preset if within 4% of the slider range
  const snapToPreset = (raw: number): number => {
    const logMin = Math.log(MIN_SPEED)
    const logMax = Math.log(MAX_SPEED)
    const rawRatio = (Math.log(raw) - logMin) / (logMax - logMin)
    for (const p of PRESETS) {
      const pRatio = (Math.log(p.value) - logMin) / (logMax - logMin)
      if (Math.abs(rawRatio - pRatio) < 0.04) return p.value
    }
    return Math.round(raw * 100) / 100
  }

  // Convert speed → slider fill %
  const speedToFill = (s: number) => {
    const logMin = Math.log(MIN_SPEED)
    const logMax = Math.log(MAX_SPEED)
    return ((Math.log(Math.max(MIN_SPEED, Math.min(MAX_SPEED, s))) - logMin) / (logMax - logMin)) * 100
  }

  const fillPct = speedToFill(localSpeed)
  const preset1xFill = speedToFill(1)

  const handlePreset = (v: number) => {
    setLocalSpeed(v)
    onSpeedChange(v)
  }

  const isNormal = localSpeed === 1

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="speed-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/50"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="speed-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-[#0d0d1a] border-t border-white/10"
          >
            {/* Handle — tap to close */}
            <div className="flex justify-center pt-2.5 pb-2 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1 rounded-full bg-white/30 active:bg-white/60 transition-colors" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 pb-4">
              <Gauge size={16} className="text-cyan-400" />
              <h3 className="text-white font-semibold text-sm">Velocidad y Duración</h3>
            </div>

            <div className="px-4 pb-8 space-y-5">

              {/* ── Speed indicator ── */}
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-black bg-gradient-to-r ${speedToColor(localSpeed)} bg-clip-text text-transparent`}>
                    {localSpeed}×
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">{speedLabel(localSpeed)}</p>
                </div>

                {/* Duration result */}
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock size={12} className="text-white/30" />
                    <span className="text-white/40 text-xs">Duración</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5 justify-end">
                    {!isNormal && (
                      <>
                        <span className="text-white/25 text-xs line-through">{formatDuration(originalDuration)}</span>
                        <span className="text-white/25 text-xs">→</span>
                      </>
                    )}
                    <span className={`font-bold text-sm ${isNormal ? 'text-white/60' : 'text-cyan-400'}`}>
                      {formatDuration(resultDuration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Slider ── */}
              <div className="space-y-2">
                <div
                  ref={sliderRef}
                  className="relative h-10 flex items-center cursor-pointer touch-none"
                  onPointerDown={handleSliderPointerDown}
                  onPointerMove={handleSliderPointerMove}
                >
                  {/* Track bg */}
                  <div className="absolute w-full h-1.5 rounded-full bg-white/10" />

                  {/* Fill */}
                  <div
                    className={`absolute h-1.5 rounded-full bg-gradient-to-r ${speedToColor(localSpeed)} transition-none`}
                    style={{ width: `${fillPct}%` }}
                  />

                  {/* 1× marker */}
                  <div
                    className="absolute w-px h-3 bg-white/30 rounded-full pointer-events-none"
                    style={{ left: `${preset1xFill}%` }}
                  />

                  {/* Thumb */}
                  <div
                    className={`absolute w-5 h-5 rounded-full bg-gradient-to-br ${speedToColor(localSpeed)} shadow-lg border-2 border-white/80 -translate-x-1/2 transition-none`}
                    style={{ left: `${fillPct}%` }}
                  />
                </div>

                {/* Min / Max labels */}
                <div className="flex justify-between px-0.5">
                  <span className="text-[9px] text-white/25">0.1×</span>
                  <span className="text-[9px] text-white/25">5×</span>
                </div>
              </div>

              {/* ── Preset buttons ── */}
              <div className="grid grid-cols-7 gap-1.5">
                {PRESETS.map(p => {
                  const active = localSpeed === p.value
                  return (
                    <button
                      key={p.value}
                      onClick={() => handlePreset(p.value)}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all ${
                        active
                          ? `bg-gradient-to-br ${speedToColor(p.value)} text-white shadow-lg scale-105`
                          : "bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>

              {/* ── Info pill ── */}
              {!isNormal && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    localSpeed < 1
                      ? "bg-blue-500/10 border-blue-500/20"
                      : "bg-orange-500/10 border-orange-500/20"
                  }`}
                >
                  <ChevronDown
                    size={13}
                    className={`shrink-0 ${localSpeed < 1 ? 'text-blue-400 rotate-0' : 'text-orange-400 rotate-180'}`}
                  />
                  <p className="text-[10px] text-white/50 leading-tight">
                    {localSpeed < 1
                      ? `El video irá ${localSpeed}× más lento — la duración aumenta a ${formatDuration(resultDuration)}`
                      : `El video irá ${localSpeed}× más rápido — la duración baja a ${formatDuration(resultDuration)}`
                    }
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SpeedDurationPanel
