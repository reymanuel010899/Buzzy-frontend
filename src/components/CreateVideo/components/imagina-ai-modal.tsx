"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Sparkles, Wand2, ChevronRight,
  Play, Zap, Image as ImageIcon, History,
  Mic, Clock, Download, Heart,
  Paintbrush, Clapperboard, Brain, ArrowRight, Upload, Trash2
} from "lucide-react"
import { getTemplatesByStyleSlug, getAIHistory, generateAIAndWait, getAICredits, publishAIContent, type AITemplate, type AIGenerationHistory, type PurchaseResult } from "@/services/aiService"
import { getMediaUrl } from "@/redux/client/api-client"
import AIRechargeModal from "./ai-recharge-modal"

interface ImaginaAIModalProps {
  isOpen: boolean
  onClose: () => void
}

type CreationMode = 'select' | 'image' | 'video' | 'history'
type VideoStep = 'style' | 'prompt' | 'generating' | 'complete'

// Estilos de creacion
const creationStyles = [
  { 
    id: 'cinematic', 
    name: 'Cinematico', 
    desc: 'Aspecto de pelicula profesional',
    gradient: 'from-amber-500 via-orange-500 to-red-600',
    preview: '/api/placeholder/200/300'
  },
  { 
    id: 'anime', 
    name: 'Anime', 
    desc: 'Estilo japones animado',
    gradient: 'from-pink-500 via-purple-500 to-indigo-600',
    preview: '/api/placeholder/200/300'
  },
  { 
    id: 'realistic', 
    name: 'Realista', 
    desc: 'Fotorrealismo con IA',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    preview: '/api/placeholder/200/300'
  },
  { 
    id: 'artistic', 
    name: 'Artistico', 
    desc: 'Pintura digital creativa',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
    preview: '/api/placeholder/200/300'
  },
  { 
    id: '3d', 
    name: '3D Render', 
    desc: 'Modelado tridimensional',
    gradient: 'from-blue-500 via-indigo-500 to-violet-600',
    preview: '/api/placeholder/200/300'
  },
  { 
    id: 'retro', 
    name: 'Retro', 
    desc: 'Estetica vintage y nostalgica',
    gradient: 'from-yellow-500 via-orange-500 to-rose-600',
    preview: '/api/placeholder/200/300'
  },
]


const ImaginaAIModal: React.FC<ImaginaAIModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<CreationMode>('select')
  const [videoStep, setVideoStep] = useState<VideoStep>('style')
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState<'5' | '6' | '10'>('6')
  const [generatingProgress, setGeneratingProgress] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const [videoCredits, setVideoCredits] = useState(0)
  const [imageCredits, setImageCredits] = useState(0)
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [styleTemplates, setStyleTemplates] = useState<AITemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplatePrompt, setSelectedTemplatePrompt] = useState<string | null>(null)
  const [generatedMediaUrl, setGeneratedMediaUrl] = useState<string | null>(null)
  const [generatedHistoryId, setGeneratedHistoryId] = useState<number | null>(null)
  const [publishLoading, setPublishLoading] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<AIGenerationHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AIGenerationHistory | null>(null)
  const [historyPublishLoading, setHistoryPublishLoading] = useState(false)
  const progressIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // Seconds-based credit helpers (1 video credit = 6 seconds)
  const SECS_PER_CREDIT = 6
  const availableSeconds = videoCredits * SECS_PER_CREDIT
  const videoCost = Math.ceil(parseInt(duration) / SECS_PER_CREDIT) // credits consumed
  const hasEnoughCredits = videoCredits >= videoCost

  // Handle reference image upload
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReferenceImage(file)
      const url = URL.createObjectURL(file)
      setReferencePreview(url)
    }
  }

  const removeReferenceImage = () => {
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview)
    }
    setReferenceImage(null)
    setReferencePreview(null)
  }

  const handleClose = () => {
    setMode('select')
    setVideoStep('style')
    setSelectedStyle(null)
    setPrompt('')
    setGeneratingProgress(0)
    setSelectedTemplatePrompt(null)
    setGeneratedMediaUrl(null)
    setGenerateError(null)
    setStyleTemplates([])
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    removeReferenceImage()
    onClose()
  }

  const handleGenerate = async () => {
    const finalPrompt = [selectedTemplatePrompt, prompt.trim()].filter(Boolean).join('. ')
    if (!finalPrompt) return

    setVideoStep('generating')
    setGeneratingProgress(0)
    setGenerateError(null)

    // Animate progress while waiting for API
    progressIntervalRef.current = setInterval(() => {
      setGeneratingProgress(prev => (prev < 88 ? prev + Math.random() * 7 : prev))
    }, 700)

    try {
      const result = await generateAIAndWait(
        {
          prompt: finalPrompt,
          type: mode === 'video' ? 'video' : 'image',
          style: selectedStyle || 'cinematic',
          duration: mode === 'video' ? parseInt(duration) : undefined,
          reference_image: referenceImage,
        },
        (status) => {
          // Avanzar la barra de progreso según el estado
          if (status === 'processing') setGeneratingProgress(prev => Math.min(prev + 15, 88))
        },
      )
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      setGeneratingProgress(100)
      setGeneratedMediaUrl(result.media_url)
      setGeneratedHistoryId(result.history_id)
      if (result.video_credits !== undefined) setVideoCredits(result.video_credits)
      if (result.image_credits !== undefined) setImageCredits(result.image_credits)
      setTimeout(() => setVideoStep('complete'), 500)
    } catch (err: unknown) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      const msg = (err as { message?: string; response?: { data?: { error?: string } } })?.response?.data?.error
        || (err as { message?: string })?.message
      setGenerateError(msg || 'Error al generar. Intenta de nuevo.')
      setVideoStep('prompt')
    }
  }

  const handlePublish = async () => {
    if (!generatedHistoryId || publishLoading) return
    setPublishLoading(true)
    try {
      await publishAIContent(generatedHistoryId)
      handleClose()
    } catch (err) {
      console.error('Error publicando:', err)
    } finally {
      setPublishLoading(false)
    }
  }

  const handleBack = () => {
    if (mode === 'history') {
      setMode('select')
    } else if (videoStep === 'prompt') {
      setVideoStep('style')
      setSelectedTemplatePrompt(null)
    } else if (videoStep === 'style') {
      setMode('select')
    }
  }

  // Fetch templates when entering the prompt step (video) or selecting a style (image)
  useEffect(() => {
    const shouldFetch =
      (mode === 'video' && videoStep === 'prompt' && selectedStyle) ||
      (mode === 'image' && selectedStyle)
    if (shouldFetch && selectedStyle) {
      setTemplatesLoading(true)
      setStyleTemplates([])
      getTemplatesByStyleSlug(selectedStyle)
        .then(setStyleTemplates)
        .catch(() => setStyleTemplates([]))
        .finally(() => setTemplatesLoading(false))
    }
  }, [videoStep, selectedStyle, mode])

  // Fetch AI credits on mount
  useEffect(() => {
    if (isOpen) {
      getAICredits()
        .then(({ video_credits, image_credits }) => {
          setVideoCredits(video_credits)
          setImageCredits(image_credits)
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Fetch history when entering history mode
  useEffect(() => {
    if (mode === 'history') {
      setHistoryLoading(true)
      getAIHistory()
        .then(setHistoryItems)
        .catch(() => setHistoryItems([]))
        .finally(() => setHistoryLoading(false))
    }
  }, [mode])

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center"
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md h-[92vh] bg-[#0c0c14] rounded-t-[32px] overflow-hidden"
          >
            {/* Efectos de fondo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px]" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <div className="relative px-5 pt-4 pb-3">
              <div className="flex items-center justify-between">
                {/* Left: X + video credits (juntos) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={mode === 'select' ? handleClose : handleBack}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                  >
                    {mode === 'select' ? (
                      <X size={20} className="text-white" />
                    ) : (
                      <ChevronRight size={20} className="text-white rotate-180" />
                    )}
                  </button>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-[#C9963F]/20 to-[#E8A830]/20 border border-[#C9963F]/40">
                    <Clapperboard size={13} className="text-[#F2C94C]" />
                    <span className="text-[#F2C94C] font-bold text-sm">{availableSeconds}s</span>
                  </div>
                </div>

                {/* Center: IMAGINA title */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center">
                    <Brain size={16} className="text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">IMAGINA</span>
                </div>

                {/* Right: image credits */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-[#C9963F]/20 to-[#E8A830]/20 border border-[#C9963F]/40">
                  <ImageIcon size={13} className="text-[#F2C94C]" />
                  <span className="text-[#F2C94C] font-bold text-sm">{imageCredits}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="relative h-[calc(100%-72px)] overflow-y-auto px-5 pb-8">
              <AnimatePresence mode="wait">
                {/* MODO SELECCION */}
                {mode === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {/* Titulo principal */}
                    <div className="text-center pt-4">
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Crea con IA
                      </h2>
                      <p className="text-gray-400 text-sm">
                        Transforma tus ideas en contenido increible
                      </p>
                    </div>

                    {/* Opciones principales */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Crear Video */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setMode('video'); setVideoStep('style'); setSelectedStyle(null); setSelectedTemplatePrompt(null); setGenerateError(null); setGeneratedMediaUrl(null); }}
                        className="relative aspect-[4/5] rounded-3xl overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        
                        {/* Icono animado */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, 5, -5, 0]
                            }}
                            transition={{ 
                              duration: 3, 
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4"
                          >
                            <Clapperboard size={32} className="text-white" />
                          </motion.div>
                          <span className="text-white font-bold text-lg">Video</span>
                          <span className="text-white/60 text-xs mt-1">5-6-10 segundos</span>
                        </div>

                        {/* Particulas decorativas */}
                        <motion.div
                          animate={{ y: [-10, 10, -10] }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="absolute top-4 right-4 w-2 h-2 rounded-full bg-cyan-400"
                        />
                        <motion.div
                          animate={{ y: [10, -10, 10] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="absolute bottom-20 left-4 w-1.5 h-1.5 rounded-full bg-purple-400"
                        />
                      </motion.button>

                      {/* Crear Imagen */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setMode('image'); setVideoStep('style'); setSelectedStyle(null); setSelectedTemplatePrompt(null); setGenerateError(null); setGeneratedMediaUrl(null); }}
                        className="relative aspect-[4/5] rounded-3xl overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-orange-600" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, -5, 5, 0]
                            }}
                            transition={{ 
                              duration: 3, 
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.5
                            }}
                            className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4"
                          >
                            <Paintbrush size={32} className="text-white" />
                          </motion.div>
                          <span className="text-white font-bold text-lg">Imagen</span>
                          <span className="text-white/60 text-xs mt-1">Alta resolucion</span>
                        </div>

                        <motion.div
                          animate={{ y: [10, -10, 10] }}
                          transition={{ duration: 3.5, repeat: Infinity }}
                          className="absolute top-6 left-4 w-2 h-2 rounded-full bg-pink-300"
                        />
                        <motion.div
                          animate={{ y: [-10, 10, -10] }}
                          transition={{ duration: 4.5, repeat: Infinity }}
                          className="absolute bottom-24 right-6 w-1.5 h-1.5 rounded-full bg-orange-300"
                        />
                      </motion.button>
                    </div>

                    {/* Historial */}
                    <motion.button
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setMode('history')}
                      className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                        <History size={24} className="text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-white font-semibold">Historial</span>
                        <p className="text-gray-500 text-xs">Ver tus creaciones anteriores</p>
                      </div>
                      <ChevronRight size={20} className="text-gray-500" />
                    </motion.button>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Clapperboard size={13} className="text-[#F2C94C]" />
                          <span className="text-xl font-bold text-[#F2C94C]">{availableSeconds}s</span>
                        </div>
                        <p className="text-gray-500 text-[10px]">Segundos disponibles</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <ImageIcon size={13} className="text-pink-400" />
                          <span className="text-xl font-bold text-pink-400">{imageCredits}</span>
                        </div>
                        <p className="text-gray-500 text-[10px]">Imágenes disponibles</p>
                      </div>
                    </div>

                    {/* Recargar button */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setRechargeOpen(true)}
                      className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#C9963F]/15 to-[#E8A830]/15 border border-[#C9963F]/40 flex items-center gap-3 hover:border-[#C9963F]/60 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9963F] to-[#E8A830] flex items-center justify-center flex-shrink-0">
                        <Zap size={20} className="text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-white font-semibold text-sm">Recargar créditos</span>
                        <p className="text-gray-500 text-[10px]">Compra más videos e imágenes IA</p>
                      </div>
                      <ChevronRight size={18} className="text-[#F2C94C]" />
                    </motion.button>
                  </motion.div>
                )}

                {/* MODO VIDEO */}
                {mode === 'video' && (
                  <motion.div
                    key="video"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-3"
                  >
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {['style', 'prompt', 'generating'].map((step, i) => (
                        <React.Fragment key={step}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            videoStep === step 
                              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white' 
                              : i < ['style', 'prompt', 'generating'].indexOf(videoStep)
                                ? 'bg-cyan-500 text-white'
                                : 'bg-white/10 text-gray-500'
                          }`}>
                            {i + 1}
                          </div>
                          {i < 2 && (
                            <div className={`w-12 h-0.5 rounded ${
                              i < ['style', 'prompt', 'generating'].indexOf(videoStep)
                                ? 'bg-cyan-500'
                                : 'bg-white/10'
                            }`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {/* Step 1: Seleccionar Estilo */}
                      {videoStep === 'style' && (
                        <motion.div
                          key="style-step"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-3"
                        >
                          <div className="text-center">
                            <h3 className="text-lg font-bold text-white">Elige un estilo</h3>
                            <p className="text-gray-500 text-xs">Define la estetica de tu video</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {creationStyles.map((style) => (
                              <motion.button
                                key={style.id}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSelectedStyle(style.id)}
                                className={`relative aspect-[3/2] rounded-xl overflow-hidden transition-all ${
                                  selectedStyle === style.id
                                    ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-[#0c0c14]'
                                    : ''
                                }`}
                              >
                                <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                  <span className="text-white font-bold text-xs">{style.name}</span>
                                  <p className="text-white/60 text-[9px] mt-0.5">{style.desc}</p>
                                </div>

                                {selectedStyle === style.id && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center"
                                  >
                                    <Sparkles size={10} className="text-white" />
                                  </motion.div>
                                )}
                              </motion.button>
                            ))}
                          </div>

                          {/* Duracion */}
                          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-white text-xs font-medium">Duracion</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {(['5', '6', '10'] as const).map((d) => (
                                <button
                                  key={d}
                                  onClick={() => setDuration(d)}
                                  className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    duration === d
                                      ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                                      : 'bg-white/5 text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {d}s
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Boton Continuar */}
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectedStyle && setVideoStep('prompt')}
                            disabled={!selectedStyle}
                            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                              selectedStyle
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <span>Continuar</span>
                            <ArrowRight size={16} />
                          </motion.button>
                        </motion.div>
                      )}

                      {/* Step 2: Prompt */}
                      {videoStep === 'prompt' && (
                        <motion.div
                          key="prompt-step"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-4"
                        >
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-white">Describe tu vision</h3>
                            <p className="text-gray-500 text-sm">Cuanto mas detalle, mejor resultado</p>
                          </div>

                          {/* Estilo seleccionado */}
                          {selectedStyle && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                                creationStyles.find(s => s.id === selectedStyle)?.gradient
                              }`} />
                              <div>
                                <span className="text-white text-sm font-medium">
                                  {creationStyles.find(s => s.id === selectedStyle)?.name}
                                </span>
                                <p className="text-gray-500 text-xs">{duration} segundos</p>
                              </div>
                            </div>
                          )}

                          {/* Imagen de referencia */}
                          <div className="space-y-2">
                            <span className="text-gray-400 text-xs font-medium">Imagen de referencia (opcional)</span>
                            {referencePreview ? (
                              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
                                <img 
                                  src={referencePreview} 
                                  alt="Referencia" 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <button
                                  onClick={removeReferenceImage}
                                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center hover:bg-red-500 transition-all"
                                >
                                  <Trash2 size={14} className="text-white" />
                                </button>
                                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-white/10 backdrop-blur-sm">
                                  <span className="text-white text-xs">Referencia activa</span>
                                </div>
                              </div>
                            ) : (
                              <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-cyan-500/50 cursor-pointer transition-all group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleReferenceUpload}
                                  className="hidden"
                                />
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-purple-500/30 transition-all">
                                  <Upload size={18} className="text-cyan-400" />
                                </div>
                                <div>
                                  <span className="text-white text-sm font-medium">Subir imagen base</span>
                                  <p className="text-gray-500 text-xs">La IA usara esta imagen como inspiracion</p>
                                </div>
                              </label>
                            )}
                          </div>

                          {/* Plantillas del estilo */}
                          <div className="space-y-2">
                            <span className="text-gray-400 text-xs font-medium">Plantillas sugeridas</span>
                            {templatesLoading ? (
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="flex-shrink-0 w-32 h-16 rounded-xl bg-white/5 animate-pulse" />
                                ))}
                              </div>
                            ) : styleTemplates.length > 0 ? (
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {styleTemplates.map((tpl) => (
                                  <motion.button
                                    key={tpl.id}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setSelectedTemplatePrompt(
                                      selectedTemplatePrompt === tpl.prompt ? null : tpl.prompt
                                    )}
                                    className={`flex-shrink-0 w-28 rounded-xl overflow-hidden text-left transition-all border ${
                                      selectedTemplatePrompt === tpl.prompt
                                        ? 'border-cyan-500/70 ring-1 ring-cyan-500/40'
                                        : 'border-white/10 hover:border-white/30'
                                    }`}
                                  >
                                    {tpl.image_url ? (
                                      <div className="relative w-full h-16">
                                        <img
                                          src={tpl.image_url}
                                          alt={tpl.title}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const t = e.currentTarget;
                                            t.style.display = 'none';
                                            t.parentElement!.classList.add('bg-white/5', 'flex', 'items-center', 'justify-center');
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                        {selectedTemplatePrompt === tpl.prompt && (
                                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                                            <Sparkles size={8} className="text-white" />
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="w-full h-16 bg-white/5" />
                                    )}
                                    <div className="p-1.5 bg-[#0f0f1a]">
                                      <span className="text-[9px] font-semibold text-white block leading-tight line-clamp-1">{tpl.title}</span>
                                    </div>
                                  </motion.button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {/* Plantilla seleccionada chip */}
                          {selectedTemplatePrompt && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30"
                            >
                              <Sparkles size={12} className="text-cyan-400 flex-shrink-0" />
                              <span className="text-cyan-300 text-[10px] flex-1 line-clamp-1">{selectedTemplatePrompt}</span>
                              <button onClick={() => setSelectedTemplatePrompt(null)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={12} />
                              </button>
                            </motion.div>
                          )}

                          {/* Error */}
                          {generateError && (
                            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
                              <span className="text-red-400 text-xs">{generateError}</span>
                            </div>
                          )}

                          {/* Input de prompt */}
                          <div className="relative">
                            <textarea
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              placeholder={selectedTemplatePrompt ? "Agrega detalles extra (opcional)..." : "Describe lo que quieres crear..."}
                              className="w-full h-28 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500/50 text-white text-sm placeholder-gray-500 resize-none outline-none transition-all"
                            />
                            <button
                              onClick={() => setIsRecording(!isRecording)}
                              className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isRecording 
                                  ? 'bg-red-500 animate-pulse' 
                                  : 'bg-white/10 hover:bg-white/20'
                              }`}
                            >
                              <Mic size={18} className="text-white" />
                            </button>
                          </div>

                   

                          {/* Costo */}
                          <div className={`flex items-center justify-between p-3 rounded-xl border ${hasEnoughCredits ? 'bg-[#C9963F]/10 border-[#C9963F]/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="flex items-center gap-2">
                              <Zap size={16} className={hasEnoughCredits ? 'text-[#F2C94C]' : 'text-red-400'} />
                              <span className="text-white text-sm">Costo de generacion</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-bold text-sm ${hasEnoughCredits ? 'text-[#F2C94C]' : 'text-red-400'}`}>
                                {duration}s
                              </span>
                              {!hasEnoughCredits && (
                                <p className="text-red-400 text-[10px]">Solo tienes {availableSeconds}s</p>
                              )}
                            </div>
                          </div>

                          {/* Boton Generar */}
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGenerate}
                            disabled={(!selectedTemplatePrompt && !prompt.trim()) || !hasEnoughCredits}
                            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                              (selectedTemplatePrompt || prompt.trim()) && hasEnoughCredits
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <Wand2 size={16} />
                            <span>Generar Video</span>
                            <Sparkles size={14} />
                          </motion.button>
                        </motion.div>
                      )}

                      {/* Step 3: Generando */}
                      {videoStep === 'generating' && (
                        <motion.div
                          key="generating-step"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex flex-col items-center justify-center py-12 space-y-8"
                        >
                          {/* Orbe de generacion */}
                          <div className="relative w-40 h-40">
                            {/* Anillos animados */}
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={`ring-${i}`}
                                className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
                                animate={{
                                  scale: [1, 1.5, 1],
                                  opacity: [0.5, 0, 0.5],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  delay: i * 0.4,
                                }}
                              />
                            ))}
                            
                            {/* Orbe central */}
                            <motion.div
                              animate={{ 
                                rotate: 360,
                              }}
                              transition={{ 
                                duration: 8, 
                                repeat: Infinity, 
                                ease: "linear" 
                              }}
                              className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500"
                            />
                            
                            {/* Icono central */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                <Brain size={40} className="text-white" />
                              </motion.div>
                            </div>
                          </div>

                          {/* Texto y progreso */}
                          <div className="text-center space-y-4 w-full max-w-xs">
                            <h3 className="text-xl font-bold text-white">Creando tu video</h3>
                            <p className="text-gray-400 text-sm">
                              La IA esta trabajando en tu vision
                            </p>
                            
                            {/* Barra de progreso */}
                            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full"
                                style={{ width: `${generatingProgress}%` }}
                              />
                            </div>
                            <span className="text-cyan-400 font-bold text-lg">
                              {Math.round(generatingProgress)}%
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 4: Completado */}
                      {videoStep === 'complete' && (
                        <motion.div
                          key="complete-step"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center justify-center py-6 space-y-5"
                        >
                          {/* Preview real */}
                          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10">
                            {generatedMediaUrl ? (
                              <video
                                src={generatedMediaUrl}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                                <Play size={32} className="text-white ml-1" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
                              <Sparkles size={10} className="text-cyan-400" />
                              <span className="text-white text-[10px] font-medium">Generado con IA</span>
                            </div>
                          </div>

                          <div className="text-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', delay: 0.1 }}
                              className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9963F] to-[#F2C94C] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#C9963F]/30"
                            >
                              <Sparkles size={22} className="text-white" />
                            </motion.div>
                            <h3 className="text-lg font-bold text-white mb-1">Creacion lista</h3>
                            <p className="text-gray-400 text-xs">Tu contenido esta listo para publicar</p>
                          </div>

                          <div className="flex gap-3 w-full">
                            <button
                              onClick={handleClose}
                              className="flex-1 py-3 rounded-xl bg-white/10 text-white text-sm font-medium"
                            >
                              Cerrar
                            </button>
                            {generatedMediaUrl && (
                              <a
                                href={generatedMediaUrl}
                                download
                                className="py-3 px-4 rounded-xl bg-white/10 text-white flex items-center justify-center"
                              >
                                <Download size={16} />
                              </a>
                            )}
                            <button onClick={handlePublish} disabled={publishLoading} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#C9963F] to-[#F2C94C] text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-lg shadow-[#C9963F]/30">
                              <Play size={14} />
                              {publishLoading ? 'Publicando...' : 'Publicar'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* MODO IMAGEN */}
                {mode === 'image' && (
                  <motion.div
                    key="image"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-3"
                  >
                    <AnimatePresence mode="wait">
                      {/* Formulario imagen */}
                      {videoStep !== 'generating' && videoStep !== 'complete' && (
                        <motion.div
                          key="image-form"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-3"
                        >
                          <div className="text-center pt-2">
                            <h3 className="text-lg font-bold text-white">Crear Imagen</h3>
                            <p className="text-gray-500 text-xs">Genera arte unico con IA</p>
                          </div>

                          {/* Estilos */}
                          <div className="grid grid-cols-3 gap-2">
                            {creationStyles.slice(0, 6).map((style) => (
                              <motion.button
                                key={style.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedStyle(style.id)}
                                className={`relative aspect-[4/3] rounded-xl overflow-hidden ${
                                  selectedStyle === style.id ? 'ring-2 ring-cyan-400' : ''
                                }`}
                              >
                                <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
                                <div className="absolute inset-0 bg-black/40 flex items-end justify-start p-2">
                                  <span className="text-white text-[10px] font-bold">{style.name}</span>
                                </div>
                              </motion.button>
                            ))}
                          </div>

                          {/* Plantillas del estilo seleccionado */}
                          {selectedStyle && (
                            <div className="space-y-2">
                              <span className="text-gray-400 text-xs font-medium">Plantillas sugeridas</span>
                              {templatesLoading ? (
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                                  {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex-shrink-0 w-28 h-16 rounded-xl bg-white/5 animate-pulse" />
                                  ))}
                                </div>
                              ) : styleTemplates.length > 0 ? (
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                  {styleTemplates.map((tpl) => (
                                    <motion.button
                                      key={tpl.id}
                                      whileTap={{ scale: 0.96 }}
                                      onClick={() => setSelectedTemplatePrompt(
                                        selectedTemplatePrompt === tpl.prompt ? null : tpl.prompt
                                      )}
                                      className={`flex-shrink-0 w-28 rounded-xl overflow-hidden text-left transition-all border ${
                                        selectedTemplatePrompt === tpl.prompt
                                          ? 'border-pink-500/70 ring-1 ring-pink-500/40'
                                          : 'border-white/10 hover:border-white/30'
                                      }`}
                                    >
                                      {tpl.image_url ? (
                                        <div className="relative w-full h-16">
                                          <img src={tpl.image_url} alt={tpl.title} className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                          {selectedTemplatePrompt === tpl.prompt && (
                                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                                              <Sparkles size={8} className="text-white" />
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-full h-16 bg-white/5" />
                                      )}
                                      <div className="p-1.5 bg-[#0f0f1a]">
                                        <span className="text-[9px] font-semibold text-white block leading-tight line-clamp-1">{tpl.title}</span>
                                      </div>
                                    </motion.button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )}

                          {/* Chip plantilla seleccionada */}
                          {selectedTemplatePrompt && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-500/10 border border-pink-500/30"
                            >
                              <Sparkles size={12} className="text-pink-400 flex-shrink-0" />
                              <span className="text-pink-300 text-[10px] flex-1 line-clamp-1">{selectedTemplatePrompt}</span>
                              <button onClick={() => setSelectedTemplatePrompt(null)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={12} />
                              </button>
                            </motion.div>
                          )}

                          {/* Error */}
                          {generateError && (
                            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
                              <span className="text-red-400 text-xs">{generateError}</span>
                            </div>
                          )}

                          {/* Imagen de referencia */}
                          <div className="space-y-2">
                            <span className="text-gray-400 text-xs font-medium">Imagen de referencia (opcional)</span>
                            {referencePreview ? (
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                                  <img src={referencePreview} alt="Referencia" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-white text-xs font-medium">Referencia activa</span>
                                  <p className="text-gray-500 text-[10px] truncate">{referenceImage?.name}</p>
                                </div>
                                <button
                                  onClick={removeReferenceImage}
                                  className="w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-all flex-shrink-0"
                                >
                                  <Trash2 size={12} className="text-white" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-pink-500/50 cursor-pointer transition-all group">
                                <input type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center group-hover:from-pink-500/30 group-hover:to-orange-500/30 transition-all">
                                  <Upload size={16} className="text-pink-400" />
                                </div>
                                <div>
                                  <span className="text-white text-sm font-medium">Subir imagen base</span>
                                  <p className="text-gray-500 text-[10px]">Genera variaciones de esta imagen</p>
                                </div>
                              </label>
                            )}
                          </div>

                          {/* Prompt */}
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={selectedTemplatePrompt ? "Agrega detalles extra (opcional)..." : "Describe la imagen que quieres crear..."}
                            className="w-full h-20 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-pink-500/50 text-white text-sm placeholder-gray-500 resize-none outline-none transition-all"
                          />

                          {/* Generar */}
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGenerate}
                            disabled={!selectedTemplatePrompt && !prompt.trim() && !referenceImage}
                            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                              selectedTemplatePrompt || prompt.trim() || referenceImage
                                ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/25'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles size={16} />
                            <span>Generar Imagen</span>
                          </motion.button>
                        </motion.div>
                      )}

                      {/* Generando */}
                      {videoStep === 'generating' && (
                        <motion.div
                          key="image-generating"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex flex-col items-center justify-center py-12 space-y-8"
                        >
                          <div className="relative w-40 h-40">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={`ring-img-${i}`}
                                className="absolute inset-0 rounded-full border-2 border-pink-500/30"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                              />
                            ))}
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-4 rounded-full bg-gradient-to-br from-pink-500 via-[#C9963F] to-[#F2C94C]"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                                <Brain size={40} className="text-white" />
                              </motion.div>
                            </div>
                          </div>
                          <div className="text-center space-y-4 w-full max-w-xs">
                            <h3 className="text-xl font-bold text-white">Creando tu imagen</h3>
                            <p className="text-gray-400 text-sm">La IA esta trabajando en tu vision</p>
                            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full"
                                style={{ width: `${generatingProgress}%` }}
                              />
                            </div>
                            <span className="text-pink-400 font-bold text-lg">{Math.round(generatingProgress)}%</span>
                          </div>
                        </motion.div>
                      )}

                      {/* Completado */}
                      {videoStep === 'complete' && (
                        <motion.div
                          key="image-complete"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center justify-center py-6 space-y-5"
                        >
                          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10">
                            {generatedMediaUrl ? (
                              <img src={generatedMediaUrl} alt="Imagen generada" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center">
                                <ImageIcon size={32} className="text-white/40" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
                              <Sparkles size={10} className="text-pink-400" />
                              <span className="text-white text-[10px] font-medium">Generado con IA</span>
                            </div>
                          </div>
                          <div className="text-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', delay: 0.1 }}
                              className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9963F] to-[#F2C94C] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#C9963F]/30"
                            >
                              <Sparkles size={22} className="text-white" />
                            </motion.div>
                            <h3 className="text-lg font-bold text-white mb-1">Imagen lista</h3>
                            <p className="text-gray-400 text-xs">Tu imagen esta lista para publicar</p>
                          </div>
                          <div className="flex gap-3 w-full">
                            <button onClick={handleClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white text-sm font-medium">
                              Cerrar
                            </button>
                            {generatedMediaUrl && (
                              <a
                                href={generatedMediaUrl}
                                download
                                className="py-3 px-4 rounded-xl bg-white/10 text-white flex items-center justify-center"
                              >
                                <Download size={16} />
                              </a>
                            )}
                            <button onClick={handlePublish} disabled={publishLoading} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#C9963F] to-[#F2C94C] text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-lg shadow-[#C9963F]/30">
                              <Play size={14} />
                              {publishLoading ? 'Publicando...' : 'Publicar'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
                {/* MODO HISTORIAL */}
                {mode === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-4"
                  >
                    <div className="text-center pt-2">
                      <h3 className="text-lg font-bold text-white">Mis Creaciones</h3>
                      <p className="text-gray-500 text-xs">Todo lo que has generado con IA</p>
                    </div>

                    {historyLoading ? (
                      <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="aspect-video rounded-xl bg-white/5 animate-pulse" />
                        ))}
                      </div>
                    ) : historyItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                          <History size={28} className="text-gray-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-white font-semibold text-sm">Sin creaciones aun</p>
                          <p className="text-gray-500 text-xs mt-1">Genera tu primer contenido con IA</p>
                        </div>
                        <button
                          onClick={() => { setMode('video'); setVideoStep('style') }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold"
                        >
                          Crear ahora
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {historyItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative rounded-xl overflow-hidden border border-white/10 group cursor-pointer"
                            onClick={() => setSelectedHistoryItem(item)}
                          >
                            {/* Thumbnail */}
                            <div className="aspect-video bg-white/5">
                              <img
                                src={getMediaUrl(item.media_url)}
                                alt={item.prompt}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            </div>

                            {/* Overlay info */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                            {/* Media type badge */}
                            <div className="absolute top-2 left-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                item.media_type === 'video'
                                  ? 'bg-cyan-500/80 text-white'
                                  : 'bg-pink-500/80 text-white'
                              }`}>
                                {item.media_type}
                              </span>
                            </div>

                            {/* Bottom info */}
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              {item.style_name && (
                                <span className="text-[9px] text-cyan-400 font-medium block">{item.style_name}</span>
                              )}
                              <p className="text-white text-[10px] leading-tight line-clamp-2 mt-0.5">{item.prompt}</p>
                              <p className="text-gray-500 text-[9px] mt-1">
                                {new Date(item.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                              </p>
                            </div>

                            {/* Hover actions */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                {item.media_type === 'video'
                                  ? <Play size={12} className="text-white ml-0.5" />
                                  : <Heart size={12} className="text-pink-400" />
                                }
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Modal detalle historial */}
    <AnimatePresence>
      {selectedHistoryItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedHistoryItem(null)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-[#0c0c14] rounded-t-[32px] overflow-hidden h-[72vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media — altura fija */}
            <div className="relative w-full h-[52%] bg-[#111] flex items-center justify-center flex-shrink-0">
              {selectedHistoryItem.media_type === 'video' ? (
                <video
                  src={getMediaUrl(selectedHistoryItem.media_url)}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : selectedHistoryItem.media_url ? (
                <img
                  src={getMediaUrl(selectedHistoryItem.media_url)}
                  alt={selectedHistoryItem.prompt}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span className="text-gray-600 text-sm">Contenido no disponible</span>
              )}
              <div className="absolute top-3 left-3">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  selectedHistoryItem.media_type === 'video' ? 'bg-cyan-500/90 text-white' : 'bg-pink-500/90 text-white'
                }`}>
                  {selectedHistoryItem.media_type}
                </span>
              </div>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Info — ocupa el resto */}
            <div className="flex flex-col flex-1 p-5 gap-3 min-h-0">
              <div className="flex-1 min-h-0 space-y-1 overflow-hidden">
                {selectedHistoryItem.style_name && (
                  <span className="text-xs text-[#F2C94C] font-semibold uppercase tracking-wide block">
                    {selectedHistoryItem.style_name}
                  </span>
                )}
                <p className="text-white text-sm leading-relaxed line-clamp-3">{selectedHistoryItem.prompt}</p>
                <p className="text-gray-500 text-xs">
                  {new Date(selectedHistoryItem.created_at).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white text-sm font-medium"
                >
                  Cerrar
                </button>
                <a
                  href={getMediaUrl(selectedHistoryItem.media_url)}
                  download
                  className="py-3 px-4 rounded-xl bg-white/10 text-white flex items-center justify-center"
                >
                  <Download size={16} />
                </a>
                <button
                  disabled={historyPublishLoading}
                  onClick={async () => {
                    setHistoryPublishLoading(true)
                    try {
                      await publishAIContent(selectedHistoryItem.id)
                      setSelectedHistoryItem(null)
                    } catch (err) {
                      console.error('Error publicando:', err)
                    } finally {
                      setHistoryPublishLoading(false)
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#C9963F] to-[#F2C94C] text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-lg shadow-[#C9963F]/30"
                >
                  <Play size={14} />
                  {historyPublishLoading ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AIRechargeModal
      isOpen={rechargeOpen}
      onClose={() => setRechargeOpen(false)}
      onSuccess={(result: PurchaseResult) => {
        setVideoCredits(result.video_credits)
        setImageCredits(result.image_credits)
        // Do NOT close here — let AIRechargeModal stay open so the user sees the success screen.
        // The modal closes itself when the user clicks "Listo, a crear" (via onClose).
      }}
      onGoToWallet={() => setRechargeOpen(false)}
    />
    </>
  )
}

export default ImaginaAIModal
