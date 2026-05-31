"use client"

import React, { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sun, Contrast, Droplets, Zap, Focus, Thermometer, Check, RotateCcw, type LucideIcon } from "lucide-react"

/* ─────────────────────────────────────────────────────────────────
   ADJUSTMENT DEFINITIONS
───────────────────────────────────────────────────────────────── */
export interface AdjustmentValues {
  brightness: number    // -100 to +100, default 0
  contrast: number
  saturation: number
  sharpness: number     // simulated via contrast+brightness
  exposure: number
  temperature: number   // hue-rotate approximation
}

export const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  temperature: 0,
}

// Convert adjustment values → CSS filter string
export function adjustmentsToCss(adj: AdjustmentValues): string {
  const brightness  = 1 + adj.brightness  / 100        // 0 → 2
  const contrast    = 1 + adj.contrast    / 100
  const saturate    = 1 + adj.saturation  / 100
  const exposure    = 1 + adj.exposure    / 100
  // sharpness: approximated by boosting contrast + brightness slightly
  const sharpCont   = 1 + (adj.sharpness * 0.5) / 100
  // temperature: warm = positive hue-rotate toward orange, cool = toward blue
  const hueRotate   = adj.temperature * 0.3            // °

  const parts: string[] = []
  if (brightness !== 1  || exposure !== 1) parts.push(`brightness(${(brightness * exposure).toFixed(3)})`)
  if (contrast   !== 1  || sharpCont !== 1) parts.push(`contrast(${(contrast * sharpCont).toFixed(3)})`)
  if (saturate   !== 1) parts.push(`saturate(${saturate.toFixed(3)})`)
  if (hueRotate  !== 0) parts.push(`hue-rotate(${hueRotate.toFixed(1)}deg)`)

  return parts.length ? parts.join(" ") : "none"
}

type AdjKey = keyof AdjustmentValues

interface AdjItem {
  key: AdjKey
  label: string
  icon: LucideIcon
  color: string        // tailwind gradient
  min: number
  max: number
  step: number
}

const ADJUSTMENTS: AdjItem[] = [
  { key: "brightness",  label: "Brillo",      icon: Sun,         color: "from-yellow-400 to-amber-500",   min: -100, max: 100, step: 1 },
  { key: "contrast",    label: "Contraste",   icon: Contrast,    color: "from-gray-400 to-gray-200",      min: -100, max: 100, step: 1 },
  { key: "saturation",  label: "Saturación",  icon: Droplets,    color: "from-pink-500 to-rose-400",      min: -100, max: 100, step: 1 },
  { key: "sharpness",   label: "Nitidez",     icon: Focus,       color: "from-blue-400 to-cyan-400",      min:     0, max: 100, step: 1 },
  { key: "exposure",    label: "Exposición",  icon: Zap,         color: "from-orange-400 to-yellow-300",  min: -100, max: 100, step: 1 },
  { key: "temperature", label: "Temperatura", icon: Thermometer, color: "from-cyan-400 to-orange-400",    min: -100, max: 100, step: 1 },
]

/* ─────────────────────────────────────────────────────────────────
   THUMB SLIDER — custom styled, no native track visible
───────────────────────────────────────────────────────────────── */
const AdjSlider: React.FC<{
  value: number
  min: number
  max: number
  step: number
  color: string
  onChange: (v: number) => void
}> = ({ value, min, max, step, color, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100
  const isCenter = min < 0   // centered origin

  return (
    <div className="relative h-6 flex items-center px-1">
      {/* Track background */}
      <div className="absolute inset-x-1 h-1 rounded-full bg-white/10" />

      {/* Filled portion */}
      {isCenter ? (
        // From center to thumb
        <div
          className={`absolute h-1 rounded-full bg-gradient-to-r ${color}`}
          style={{
            left:  pct >= 50 ? "50%" : `${pct}%`,
            right: pct >= 50 ? `${100 - pct}%` : "50%",
          }}
        />
      ) : (
        <div
          className={`absolute h-1 left-1 rounded-full bg-gradient-to-r ${color}`}
          style={{ width: `${pct}%` }}
        />
      )}

      {/* Center tick (for bipolar sliders) */}
      {isCenter && (
        <div className="absolute left-1/2 -translate-x-1/2 w-px h-3 bg-white/30 rounded-full" />
      )}

      {/* Native range — invisible, on top for interaction */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        style={{ WebkitAppearance: "none" }}
      />

      {/* Custom thumb */}
      <div
        className="absolute w-5 h-5 rounded-full bg-white shadow-lg shadow-black/40 border-2 border-white/80 pointer-events-none transition-transform"
        style={{ left: `calc(${pct}% - 10px + 4px)` }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   MAIN PANEL
───────────────────────────────────────────────────────────────── */
interface AdjustmentsPanelProps {
  isOpen: boolean
  values: AdjustmentValues
  onChange: (values: AdjustmentValues) => void
  onDone: () => void
}

const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({
  isOpen, values, onChange, onDone,
}) => {
  const [activeKey, setActiveKey] = useState<AdjKey>("brightness")

  // Reset active to brightness each time panel opens
  useEffect(() => {
    if (isOpen) setActiveKey("brightness")
  }, [isOpen])

  const activeAdj = ADJUSTMENTS.find(a => a.key === activeKey)!

  const handleChange = useCallback((v: number) => {
    onChange({ ...values, [activeKey]: v })
    // Haptic feedback on supported devices
    if ("vibrate" in navigator) navigator.vibrate(4)
  }, [activeKey, values, onChange])

  const handleReset = () => {
    onChange(DEFAULT_ADJUSTMENTS)
    if ("vibrate" in navigator) navigator.vibrate(6)
  }

  const isDirty = Object.values(values).some(v => v !== 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="adj-panel"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{   y: 60,  opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="absolute inset-x-0 bottom-0 z-50 bg-[#0e0e1a] border-t border-white/10 rounded-t-3xl pb-2"
          // Prevent clicks bubbling to backdrop
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-9 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between px-4 pt-1 pb-3">
            <span className="text-white font-bold text-sm tracking-wide">Ajustes</span>
            <div className="flex items-center gap-2">
              {isDirty && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-gray-400 text-[10px] font-medium"
                >
                  <RotateCcw size={10} />
                  Reset
                </motion.button>
              )}
              <button
                onClick={onDone}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-[11px] font-bold shadow-lg shadow-cyan-500/20"
              >
                <Check size={12} strokeWidth={3} />
                Listo
              </button>
            </div>
          </div>

          {/* Active adjustment value + slider */}
          <div className="px-5 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white text-xs font-semibold">{activeAdj.label}</span>
              <motion.span
                key={values[activeKey]}
                initial={{ scale: 1.3, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-xs font-mono font-bold tabular-nums ${
                  values[activeKey] === 0 ? "text-gray-500" : "text-cyan-400"
                }`}
              >
                {values[activeKey] > 0 ? `+${values[activeKey]}` : values[activeKey]}
              </motion.span>
            </div>
            <AdjSlider
              value={values[activeKey]}
              min={activeAdj.min}
              max={activeAdj.max}
              step={activeAdj.step}
              color={activeAdj.color}
              onChange={handleChange}
            />
          </div>

          {/* Adjustment icon row */}
          <div className="flex justify-between px-3 pb-2">
            {ADJUSTMENTS.map(adj => {
              const isActive = adj.key === activeKey
              const hasValue = values[adj.key] !== 0
              return (
                <motion.button
                  key={adj.key}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => {
                    setActiveKey(adj.key)
                    if ("vibrate" in navigator) navigator.vibrate(3)
                  }}
                  className="flex flex-col items-center gap-1 relative"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-br ${adj.color} shadow-lg`
                        : "bg-white/8 border border-white/8"
                    }`}
                  >
                    <adj.icon
                      size={16}
                      className={isActive ? "text-white" : "text-gray-400"}
                    />
                  </div>
                  {/* Active dot */}
                  {hasValue && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 border border-[#0e0e1a]" />
                  )}
                  <span className={`text-[9px] font-medium transition-colors ${
                    isActive ? "text-white" : "text-gray-500"
                  }`}>
                    {adj.label}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AdjustmentsPanel
