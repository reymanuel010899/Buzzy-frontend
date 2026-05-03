"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Wand2, Zap, Palette, Type, Clock, Check, ChevronRight, RefreshCw, Sparkles, Loader2 } from "lucide-react"
import { VIDEO_FILTERS, type VideoFilter } from "./VideoFilterPanel"
import { type AdjustmentValues, DEFAULT_ADJUSTMENTS } from "./AdjustmentsPanel"
import { type TextOverlayData } from "./text-editor-overlay"
import { type StickerOverlayData } from "./StickerPanel"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DirectorAIResult {
  filter: VideoFilter
  adjustments: AdjustmentValues
  speed: number
  caption: TextOverlayData | null
  summary: string[]
  correctedTextOverlays: TextOverlayData[]
  correctedStickerOverlays: StickerOverlayData[]
}

interface DirectorAIPanelProps {
  isOpen: boolean
  onClose: () => void
  videoDuration: number
  videoSrc: string | null
  textOverlays: TextOverlayData[]
  stickerOverlays: StickerOverlayData[]
  onApply: (result: DirectorAIResult) => void
  onApplyPrompt?: (prompt: string) => Promise<string[]>
}

// ── Analysis helpers ───────────────────────────────────────────────────────────

interface FrameAnalysis {
  brightness: number   // 0–255 avg luminance
  saturation: number   // 0–1 avg saturation
  motion: number       // 0–1 motion vs prev frame
  warmth: number       // 0–1 (red–blue channel ratio)
}

/** Sample N evenly-spaced frames from a video and return analysis per frame */
async function analyzeVideoFrames(
  src: string,
  sampleCount: number,
  onProgress: (p: number) => void,
): Promise<FrameAnalysis[]> {
  // Resolve the real duration, handling Infinity (common in FFmpeg-processed blobs
  // where the moov atom is at the end — we seek to a large value to force it)
  const resolveDuration = (video: HTMLVideoElement): Promise<number> =>
    new Promise((resolve, reject) => {
      const finish = () => {
        if (isFinite(video.duration) && video.duration > 0) {
          resolve(video.duration)
        } else {
          reject(new Error("Could not determine video duration"))
        }
      }

      const onDurationChange = () => {
        if (isFinite(video.duration) && video.duration > 0) {
          video.removeEventListener("durationchange", onDurationChange)
          resolve(video.duration)
        }
      }

      if (isFinite(video.duration) && video.duration > 0) {
        resolve(video.duration)
      } else {
        // Seek to a large value forces the browser to scan the file and report real duration
        video.addEventListener("durationchange", onDurationChange)
        video.currentTime = 1e9
      }

      video.onerror = () => reject(new Error("Video load error"))
      setTimeout(() => reject(new Error("Duration resolve timeout")), 10_000)
      void finish // prevent unused-var lint
    })

  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    // Do NOT set crossOrigin for local blob/object URLs — it taints the canvas
    // and can prevent loadedmetadata from firing for processed video blobs.
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      video.crossOrigin = "anonymous"
    }
    video.src = src
    video.muted = true
    video.preload = "metadata"

    video.onloadedmetadata = async () => {
      try {
        const duration = await resolveDuration(video)

        const canvas = document.createElement("canvas")
        canvas.width  = 64   // tiny — just for analysis
        canvas.height = 64
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!

        const results: FrameAnalysis[] = []
        let prevData: Uint8ClampedArray | null = null

        for (let i = 0; i < sampleCount; i++) {
          const t = (i / Math.max(sampleCount - 1, 1)) * duration
          await seekTo(video, t)
          ctx.drawImage(video, 0, 0, 64, 64)
          const { data } = ctx.getImageData(0, 0, 64, 64)

          let sumL = 0, sumS = 0, sumR = 0, sumB = 0, motionDiff = 0
          const pixCount = data.length / 4

          for (let p = 0; p < data.length; p += 4) {
            const r = data[p], g = data[p + 1], b = data[p + 2]
            // Luminance (standard BT.601)
            const l = 0.299 * r + 0.587 * g + 0.114 * b
            sumL += l
            sumR += r
            sumB += b
            // Saturation in HSL
            const max = Math.max(r, g, b) / 255
            const min = Math.min(r, g, b) / 255
            sumS += max === 0 ? 0 : (max - min) / max

            // Motion: pixel diff vs previous frame
            if (prevData) {
              const dr = data[p]   - prevData[p]
              const dg = data[p+1] - prevData[p+1]
              const db = data[p+2] - prevData[p+2]
              motionDiff += Math.sqrt(dr*dr + dg*dg + db*db)
            }
          }

          results.push({
            brightness: sumL / pixCount,
            saturation: sumS / pixCount,
            motion: prevData ? Math.min(1, motionDiff / (pixCount * 80)) : 0,
            warmth: sumR / Math.max(1, sumB) / 2,   // > 1 = warm, < 1 = cool
          })

          prevData = new Uint8ClampedArray(data)
          onProgress(((i + 1) / sampleCount) * 100)
        }

        video.src = ""
        resolve(results)
      } catch (err) {
        reject(err)
      }
    }

    video.onerror = reject
    video.load()
  })
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise(resolve => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked)
      clearTimeout(timer)
      resolve()
    }
    // Safety timeout: some processed video blobs never fire "seeked" for certain timestamps
    const timer = setTimeout(() => {
      video.removeEventListener("seeked", onSeeked)
      resolve() // continue analysis with whatever frame is available
    }, 2_000)
    video.addEventListener("seeked", onSeeked)
    video.currentTime = t
  })
}

// ── Decision engine ────────────────────────────────────────────────────────────

interface AIDecision {
  filter: VideoFilter
  adjustments: AdjustmentValues
  speed: number
  captionText: string
  captionY: number   // percent from top
  summary: string[]
}

function makeDecision(frames: FrameAnalysis[], duration: number): AIDecision {
  const avgBrightness = frames.reduce((s, f) => s + f.brightness, 0) / frames.length
  const avgSaturation = frames.reduce((s, f) => s + f.saturation, 0) / frames.length
  const avgMotion     = frames.reduce((s, f) => s + f.motion, 0) / frames.length
  const avgWarmth     = frames.reduce((s, f) => s + f.warmth, 0) / frames.length

  const summary: string[] = []

  // ── 1. Pick filter ────────────────────────────────────────────────
  let filterId: string
  if (avgBrightness < 80) {
    filterId = "lark"          // dark scenes → brighten + saturate
    summary.push("Escena oscura detectada → filtro Lark para luminosidad")
  } else if (avgSaturation < 0.12) {
    filterId = "clarendon"     // flat / desaturated → boost contrast & color
    summary.push("Colores apagados → filtro Clarendon para viveza")
  } else if (avgWarmth > 1.4) {
    filterId = "hudson"        // very warm → cool offset for balance
    summary.push("Tonos cálidos dominantes → filtro Hudson para equilibrio")
  } else if (avgWarmth < 0.7) {
    filterId = "valencia"      // cool / blue cast → warm it up
    summary.push("Tonos fríos dominantes → filtro Valencia para calidez")
  } else if (avgSaturation > 0.4) {
    filterId = "perpetua"      // already vivid → light polish
    summary.push("Colores vibrantes → filtro Perpetua para polish sutil")
  } else {
    filterId = "juno"          // general all-rounder
    summary.push("Escena equilibrada → filtro Juno para realce profesional")
  }
  const filter = VIDEO_FILTERS.find(f => f.id === filterId) ?? VIDEO_FILTERS[0]

  // ── 2. Adjustments ────────────────────────────────────────────────
  const adjustments: AdjustmentValues = { ...DEFAULT_ADJUSTMENTS }
  if (avgBrightness < 90) {
    adjustments.brightness = 15
    summary.push("Brillo aumentado +15")
  } else if (avgBrightness > 180) {
    adjustments.brightness = -10
    summary.push("Brillo reducido -10")
  }
  if (avgSaturation < 0.15) {
    adjustments.saturation = 25
    summary.push("Saturación aumentada +25")
  }
  if (avgBrightness < 100 || avgSaturation < 0.1) {
    adjustments.contrast = 10
    summary.push("Contraste aumentado +10")
  }

  // ── 3. Speed ──────────────────────────────────────────────────────
  let speed = 1
  const highMotionPct = frames.filter(f => f.motion > 0.35).length / frames.length
  const lowMotionPct  = frames.filter(f => f.motion < 0.05).length / frames.length

  if (duration > 15 && lowMotionPct > 0.6) {
    speed = 1.5
    summary.push("Video largo y estático → velocidad 1.5× para retener atención")
  } else if (avgMotion > 0.4 && duration < 10) {
    speed = 0.75
    summary.push("Mucho movimiento en video corto → cámara lenta 0.75× para impacto")
  } else if (highMotionPct > 0.5 && duration >= 10) {
    speed = 1.25
    summary.push("Alta acción sostenida → velocidad 1.25× para energía")
  }

  // ── 4. Caption ────────────────────────────────────────────────────
  // Place caption at top (15%) to avoid face-region at center/bottom
  const captionText = ""   // leave blank — user fills it in
  const captionY    = 15

  summary.push("Subtítulo IA posicionado arriba (fuera del área facial)")

  return { filter, adjustments, speed, captionText, captionY, summary }
}

// ── Analysis step list ────────────────────────────────────────────────────────

const ANALYSIS_STEPS = [
  { icon: Palette,  text: "Analizando paleta de color…" },
  { icon: Clock,    text: "Calculando velocidad óptima…" },
  { icon: Sparkles, text: "Seleccionando filtro cinematográfico…" },
  { icon: Type,     text: "Posicionando subtítulo inteligente…" },
  { icon: Wand2,    text: "Aplicando toque final…" },
]

// ── Component ─────────────────────────────────────────────────────────────────

const DirectorAIPanel: React.FC<DirectorAIPanelProps> = ({
  isOpen, onClose, videoDuration, videoSrc, textOverlays, stickerOverlays, onApply, onApplyPrompt,
}) => {
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done">("idle")
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [result, setResult] = useState<DirectorAIResult | null>(null)
  const [promptInput, setPromptInput] = useState("")
  const [promptError, setPromptError] = useState<string | null>(null)
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false)
  const abortRef = useRef(false)

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPhase("idle")
      setResult(null)
      setPromptInput("")
      setAnalysisProgress(0)
      setCurrentStep(0)
      abortRef.current = false
    }
  }, [isOpen])

  const runAnalysis = useCallback(async () => {
    if (!videoSrc) return
    abortRef.current = false
    setPhase("analyzing")
    setAnalysisProgress(0)
    setCurrentStep(0)

    try {
      const SAMPLE_COUNT = 20

      const frames = await analyzeVideoFrames(
        videoSrc,
        SAMPLE_COUNT,
        (pct) => {
          if (abortRef.current) return
          setAnalysisProgress(pct)
          // Advance step display based on progress
          setCurrentStep(Math.min(
            ANALYSIS_STEPS.length - 1,
            Math.floor((pct / 100) * ANALYSIS_STEPS.length)
          ))
        },
      )

      if (abortRef.current) return

      const decision = makeDecision(frames, videoDuration)
      const layerAnalysis = analyzeLayerState(textOverlays, stickerOverlays)

      // Build caption overlay if text provided
      const caption: TextOverlayData | null = null // user fills it in

      const aiResult: DirectorAIResult = {
        filter:      decision.filter,
        adjustments: decision.adjustments,
        speed:       decision.speed,
        caption,
        summary:     [...decision.summary, ...layerAnalysis.summary],
        correctedTextOverlays: layerAnalysis.correctedTextOverlays,
        correctedStickerOverlays: layerAnalysis.correctedStickerOverlays,
      }

      setResult(aiResult)
      setPhase("done")
    } catch (err) {
      console.error("Director IA analysis failed:", err)
      setPhase("idle")
    }
  }, [videoSrc, videoDuration, textOverlays, stickerOverlays])

  const handleApply = async () => {
    if (!result) return

    setPromptError(null)
    let promptSummary: string[] = []
    if (promptInput.trim()) {
      if (!onApplyPrompt) {
        setPromptError("No disponible en este momento.")
        return
      }
      setIsApplyingPrompt(true)
      try {
        promptSummary = await onApplyPrompt(promptInput.trim())
      } catch (err) {
        const message =
          (err as { message?: string })?.message ??
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Error al aplicar el prompt."
        setPromptError(message)
        setIsApplyingPrompt(false)
        return
      } finally {
        setIsApplyingPrompt(false)
      }
    }

    onApply({
      ...result,
      caption: null,
      summary: [...result.summary, ...promptSummary],
    })
    onClose()
  }

  const handleClose = () => {
    abortRef.current = true
    onClose()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="director-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={phase === "analyzing" ? undefined : handleClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="director-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 z-40 rounded-t-3xl bg-[#0d0d1a] border-t border-white/10 overflow-hidden"
          >
            {/* Glowing top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
            <div className="absolute top-0 left-1/4 right-1/4 h-8 bg-purple-500/10 blur-xl pointer-events-none" />

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-0.5 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Wand2 size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm leading-none">Director IA</h3>
                  <p className="text-white/35 text-[9px] mt-0.5">Auto-edición inteligente</p>
                </div>
              </div>
              {phase !== "analyzing" && (
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="px-4 pb-8">

              {/* ── IDLE phase ── */}
              {phase === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Feature list */}
                  <div className="space-y-2">
                    {[
                      { icon: Palette,  color: "text-violet-400", label: "Filtro cinematográfico", desc: "Detecta brillo, saturación y tono para elegir el filtro ideal" },
                      { icon: Clock,    color: "text-cyan-400",   label: "Velocidad inteligente",  desc: "Analiza el movimiento del video para ajustar el ritmo automáticamente" },
                      { icon: Sparkles, color: "text-pink-400",   label: "Ajustes de imagen",     desc: "Corrige brillo y contraste según la escena grabada" },
                      { icon: Type,     color: "text-amber-400",  label: "Subtítulo posicionado", desc: "Sugiere dónde poner el texto para no tapar el sujeto" },
                    ].map(({ icon: Icon, color, label, desc }) => (
                      <div key={label} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Icon size={14} className={`${color} mt-0.5 shrink-0`} />
                        <div>
                          <p className="text-white/80 text-xs font-semibold leading-none">{label}</p>
                          <p className="text-white/35 text-[10px] mt-0.5 leading-snug">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={runAnalysis}
                    disabled={!videoSrc}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 active:scale-95 transition-transform disabled:opacity-40"
                  >
                    <Zap size={16} className="fill-white" />
                    Analizar y auto-editar
                  </button>
                </motion.div>
              )}

              {/* ── ANALYZING phase ── */}
              {phase === "analyzing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  {/* Pulsing IA orb */}
                  <div className="flex justify-center py-2">
                    <div className="relative w-16 h-16">
                      <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.15, 0.4] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-lg"
                      />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-xl">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        >
                          <Wand2 size={24} className="text-white" />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-white/40 text-[10px]">Analizando video…</span>
                      <span className="text-purple-400 text-[10px] font-bold">{Math.round(analysisProgress)}%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${analysisProgress}%` }}
                        transition={{ duration: 0.15 }}
                      />
                    </div>
                  </div>

                  {/* Current step */}
                  <div className="space-y-1.5">
                    {ANALYSIS_STEPS.map(({ icon: Icon, text }, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: i <= currentStep ? 1 : 0.2, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-2.5"
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          i < currentStep
                            ? "bg-green-500"
                            : i === currentStep
                            ? "bg-gradient-to-br from-purple-500 to-pink-500"
                            : "bg-white/10"
                        }`}>
                          {i < currentStep
                            ? <Check size={9} className="text-white" />
                            : <Icon size={9} className="text-white" />
                          }
                        </div>
                        <span className={`text-[11px] ${i <= currentStep ? "text-white/70" : "text-white/20"}`}>
                          {text}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── DONE phase ── */}
              {phase === "done" && result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Success banner */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Check size={11} className="text-white" />
                    </div>
                    <p className="text-green-400 text-xs font-semibold">Análisis completado — listo para aplicar</p>
                  </div>

                  {/* What was decided */}
                  <div className="space-y-1.5">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider px-0.5">Decisiones del Director IA</p>
                    {result.summary.map((line, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04]">
                        <ChevronRight size={10} className="text-purple-400 mt-0.5 shrink-0" />
                        <p className="text-white/55 text-[10px] leading-snug">{line}</p>
                      </div>
                    ))}
                  </div>

                  {/* Applied filter preview pill */}
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <div
                      className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-400 to-pink-400 shrink-0"
                      style={{ filter: result.filter.css !== "none" ? result.filter.css : undefined }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs font-semibold">{result.filter.label}</p>
                      <p className="text-white/30 text-[10px]">Filtro seleccionado</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-cyan-400 text-xs font-bold">{result.speed}×</p>
                      <p className="text-white/30 text-[10px]">Velocidad</p>
                    </div>
                  </div>

                  {/* Optional caption input */}
                  <div className="space-y-1.5">
                    <p className="text-white/40 text-[10px] px-0.5">Describe con un prompt lo que deseas hacer con el video</p>
                    <input
                      type="text"
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Describe cómo quieres que se edite el video…"
                      maxLength={140}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-purple-500/50 transition-colors"
                    />
                    {promptError && (
                      <p className="text-rose-300 text-[10px]">
                        {promptError}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setPhase("idle"); setResult(null) }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-semibold hover:text-white transition-colors"
                    >
                      <RefreshCw size={12} />
                      Re-analizar
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={isApplyingPrompt}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {isApplyingPrompt ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Aplicando prompt…
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          Aplicar edición
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default DirectorAIPanel
export type { DirectorAIPanelProps }

// ── Layer analysis helpers ───────────────────────────────────────────────────

const TYPO_FIXES: Array<{ pattern: RegExp; replacement: string; description: string }> = [
  { pattern: /\bq\b/gi,   replacement: "que",       description: "convierte 'q' en 'que'" },
  { pattern: /\bk\b/gi,   replacement: "que",       description: "convierte 'k' en 'que'" },
  { pattern: /\bxq\b/gi,  replacement: "porque",   description: "expande 'xq' a 'porque'" },
  { pattern: /\bporfa\b/gi, replacement: "por favor", description: "expande 'porfa' a 'por favor'" },
  { pattern: /\bpak\b/gi, replacement: "para",      description: "corrige 'pak' por 'para'" },
]

const TEXT_CENTER_MIN = 40
const TEXT_CENTER_MAX = 60
const TEXT_TARGET_Y = 18
const STICKER_MIN_SCALE = 0.7
const STICKER_MAX_SCALE = 1.3
const STICKER_ROTATION_STEP = 5

interface LayerAnalysisResult {
  correctedTextOverlays: TextOverlayData[]
  correctedStickerOverlays: StickerOverlayData[]
  summary: string[]
}

function analyzeLayerState(
  textOverlays: TextOverlayData[],
  stickerOverlays: StickerOverlayData[]
): LayerAnalysisResult {
  const textResults = textOverlays.map(sanitizeTextOverlay)
  const stickerResults = stickerOverlays.map(normalizeStickerOverlay)

  const summary: string[] = [
    ...textResults.flatMap(r => r.summary),
    ...stickerResults.flatMap(r => r.summary),
  ]

  return {
    correctedTextOverlays: textResults.map(r => r.overlay),
    correctedStickerOverlays: stickerResults.map(r => r.overlay),
    summary,
  }
}

function sanitizeTextOverlay(input: TextOverlayData): { overlay: TextOverlayData; summary: string[] } {
  const original = input.text
  let normalized = original.trim().replace(/\s+/g, " ")
  const changeNotes: string[] = []

  if (normalized !== original) {
    changeNotes.push("normaliza espacios")
  }

  for (const fix of TYPO_FIXES) {
    const updated = normalized.replace(fix.pattern, fix.replacement)
    if (updated !== normalized) {
      changeNotes.push(fix.description)
      normalized = updated
    }
  }

  if (normalized.length > 0) {
    const firstChar = normalized[0]
    if (firstChar.toLowerCase() === firstChar && firstChar !== firstChar.toUpperCase()) {
      const capitalized = firstChar.toUpperCase() + normalized.slice(1)
      if (capitalized !== normalized) {
        changeNotes.push("capitaliza inicio")
        normalized = capitalized
      }
    }
  }

  let targetY = input.y
  if (input.y >= TEXT_CENTER_MIN && input.y <= TEXT_CENTER_MAX) {
    targetY = TEXT_TARGET_Y
    changeNotes.push("lo ubica en el tercio superior")
  }

  const summary: string[] = []
  if (changeNotes.length > 0) {
    const label = original !== normalized ? `"${original}" → "${normalized}"` : `"${normalized}"`
    summary.push(`Capa de texto ${label} (${changeNotes.join(", ")})`)
  }

  return {
    overlay: {
      ...input,
      text: normalized,
      y: targetY,
    },
    summary,
  }
}

function normalizeStickerOverlay(input: StickerOverlayData): { overlay: StickerOverlayData; summary: string[] } {
  const changeNotes: string[] = []
  let scale = Math.min(STICKER_MAX_SCALE, Math.max(STICKER_MIN_SCALE, input.scale))
  if (scale !== input.scale) {
    changeNotes.push(`escala ${scale.toFixed(2)}`)
  }

  const rotation = Math.round(input.rotation / STICKER_ROTATION_STEP) * STICKER_ROTATION_STEP
  if (rotation !== input.rotation) {
    changeNotes.push(`rota ${rotation}°`)
  }

  const summary: string[] = []
  if (changeNotes.length > 0) {
    summary.push(`Sticker ${input.emoji || "sin emoji"} (${changeNotes.join(", ")})`)
  }

  return {
    overlay: {
      ...input,
      scale,
      rotation,
    },
    summary,
  }
}
