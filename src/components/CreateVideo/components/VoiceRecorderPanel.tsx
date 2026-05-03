"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Square, Play, Pause, Trash2, Check } from "lucide-react"

interface VoiceRecorderPanelProps {
  isOpen: boolean
  onClose: () => void
  onApply: (blob: Blob) => void
}

type RecordState = "idle" | "recording" | "recorded" | "playing"

const VoiceRecorderPanel: React.FC<VoiceRecorderPanelProps> = ({ isOpen, onClose, onApply }) => {
  const [recordState, setRecordState] = useState<RecordState>("idle")
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)           // segundos grabando
  const [waveform, setWaveform] = useState<number[]>(Array(40).fill(4))
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const playbackRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Limpieza al cerrar
  useEffect(() => {
    if (!isOpen) {
      stopEverything()
      setRecordState("idle")
      setRecordedBlob(null)
      setRecordedUrl(null)
      setElapsed(0)
      setWaveform(Array(40).fill(4))
      setError(null)
    }
  }, [isOpen])

  const stopEverything = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (playbackRef.current) {
      playbackRef.current.pause()
      playbackRef.current = null
    }
  }

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Visualizador de onda
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser

      const drawWave = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const bars = Array.from({ length: 40 }, (_, i) => {
          const idx = Math.floor((i / 40) * data.length)
          return Math.max(4, (data[idx] / 255) * 48)
        })
        setWaveform(bars)
        animFrameRef.current = requestAnimationFrame(drawWave)
      }
      drawWave()

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setRecordedBlob(blob)
        setRecordedUrl(url)
        setRecordState("recorded")
        setWaveform(Array(40).fill(4))
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop())
          streamRef.current = null
        }
      }

      recorder.start(100)
      setRecordState("recording")
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch {
      setError("No se pudo acceder al micrófono. Verifica los permisos.")
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  const togglePlayback = () => {
    if (!recordedUrl) return
    if (recordState === "playing") {
      playbackRef.current?.pause()
      setRecordState("recorded")
    } else {
      const audio = new Audio(recordedUrl)
      playbackRef.current = audio
      audio.onended = () => setRecordState("recorded")
      audio.play()
      setRecordState("playing")
    }
  }

  const discard = () => {
    stopEverything()
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordState("idle")
    setElapsed(0)
    setWaveform(Array(40).fill(4))
  }

  const handleApply = () => {
    if (!recordedBlob) return
    onApply(recordedBlob)
    onClose()
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="voice-panel"
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
            <span className="text-white font-semibold text-base">Grabar voz</span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs text-center mb-4 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Waveform */}
          <div className="flex items-center justify-center gap-[2px] h-14 mb-4">
            {waveform.map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: h }}
                transition={{ duration: 0.05 }}
                className={`w-1.5 rounded-full ${
                  recordState === "recording"
                    ? "bg-gradient-to-t from-purple-500 to-pink-400"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center mb-6">
            <span className={`text-2xl font-bold tabular-nums ${recordState === "recording" ? "text-pink-400" : "text-white/60"}`}>
              {fmt(elapsed)}
            </span>
            {recordState === "recording" && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-pink-400"
                />
                <span className="text-pink-400 text-xs font-medium">Grabando…</span>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center justify-center gap-4">
            {/* Descartar */}
            {(recordState === "recorded" || recordState === "playing") && (
              <button
                onClick={discard}
                className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
              >
                <Trash2 size={18} className="text-white/60" />
              </button>
            )}

            {/* Botón principal: grabar / detener */}
            {(recordState === "idle" || recordState === "recording") && (
              <button
                onClick={recordState === "recording" ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  recordState === "recording"
                    ? "bg-red-500 shadow-red-500/40"
                    : "bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/40"
                }`}
              >
                {recordState === "recording"
                  ? <Square size={22} className="text-white fill-white" />
                  : <Mic size={22} className="text-white" />
                }
              </button>
            )}

            {/* Play/pause de lo grabado */}
            {(recordState === "recorded" || recordState === "playing") && (
              <button
                onClick={togglePlayback}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/40"
              >
                {recordState === "playing"
                  ? <Pause size={22} className="text-white" />
                  : <Play size={22} className="text-white fill-white" />
                }
              </button>
            )}

            {/* Aplicar */}
            {(recordState === "recorded" || recordState === "playing") && (
              <button
                onClick={handleApply}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/40"
              >
                <Check size={18} className="text-white" />
              </button>
            )}
          </div>

          {recordState === "idle" && (
            <p className="text-white/30 text-xs text-center mt-5">
              Pulsa el micrófono para empezar a grabar
            </p>
          )}
          {(recordState === "recorded" || recordState === "playing") && (
            <p className="text-white/30 text-xs text-center mt-5">
              Pulsa <span className="text-cyan-400">✓</span> para añadir la voz al video
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default VoiceRecorderPanel
