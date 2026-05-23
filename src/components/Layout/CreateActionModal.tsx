import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Sparkles, Video, Image as ImageIcon, AlertCircle, Loader2, CheckCircle2, SlidersHorizontal, ChevronDown, HelpCircle, ImagePlus, Paintbrush, Cuboid, Tv2, Music, Mic, AudioLines, Type, Wand2, Instagram, Facebook, Play, VolumeX, Smartphone } from "lucide-react"
import { getBaseUrl } from "../../redux/client/api-client"
import { useDispatch } from "react-redux"
import { startUpload } from "../../redux/reducers/uploadProgressReducer"

interface CreateActionModalProps {
    isOpen: boolean
    onClose: () => void
    subscriptionStatus?: {
        is_active: boolean
        plan_name: string
        ai_limit: number
        ai_used: number
    }
}

interface AITemplate {
    id: number
    title: string
    prompt: string
    image_url: string
    media_type: string
}

interface AIStyle {
    id: number
    name: string
    slug: string
    icon_name: string
    color_bg: string
    color_text: string
    color_border: string
    templates: AITemplate[]
}

const getIcon = (name: string) => {
    switch (name) {
        case 'ImageIcon': return <ImageIcon size={24} />
        case 'Tv2': return <Tv2 size={24} />
        case 'Paintbrush': return <Paintbrush size={24} />
        case 'Cuboid': return <Cuboid size={24} />
        default: return <Sparkles size={24} />
    }
}

const CreateActionModal: React.FC<CreateActionModalProps> = ({ isOpen, onClose, subscriptionStatus }) => {
    const dispatch = useDispatch()
    const [selectedOption, setSelectedOption] = useState<'upload' | 'ai' | null>(null)
    const [aiType, setAiType] = useState<'video' | 'image' | 'history'>('image')
    const [history, setHistory] = useState<any[]>([])
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null)
    const [isPublishing, setIsPublishing] = useState(false)
    const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [prompt, setPrompt] = useState('')
    const [styles, setStyles] = useState<AIStyle[]>([])
    const [selectedStyle, setSelectedStyle] = useState<AIStyle | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null)
    const [referenceImage, setReferenceImage] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ url?: string; error?: string; credits?: number } | null>(null)

    // PRO CREATION STATION STATES
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploadPreview, setUploadPreview] = useState<string>('')
    const [uploadDescription, setUploadDescription] = useState('#BuzzyCreator #ProStudio\n')
    const [syncInstagram, setSyncInstagram] = useState(true)
    const [syncTikTok1, setSyncTikTok1] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'pending' | 'processing' | 'ready' | 'blocked' | 'error'>('idle')
    const [, setUploadJobId] = useState<number | null>(null)
    const [safetyLabel, _setSafetyLabel] = useState('')

    // Cleanup preview URL on unmount or file change
    useEffect(() => {
        if (uploadFile) {
            const objectUrl = URL.createObjectURL(uploadFile)
            setUploadPreview(objectUrl)
            return () => URL.revokeObjectURL(objectUrl)
        }
    }, [uploadFile])

    const handleVideoSubmit = async () => {
        if (!uploadFile) return
        setUploadStatus('pending')

        try {
            const formData = new FormData()
            formData.append('video', uploadFile)
            formData.append('description', uploadDescription)

            const token = localStorage.getItem("accessToken") || ""
            const response = await fetch(`${getBaseUrl()}api/videos/create/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                // Start global progress bar and close modal immediately
                dispatch(startUpload(data.video_id))
                handleCloseCreation()
                onClose()
            } else {
                setUploadStatus('error')
            }
        } catch (error) {
            setUploadStatus('error')
        }
    }

    const handleCloseCreation = () => {
        setUploadFile(null)
        setUploadPreview('')
        setUploadStatus('idle')
        setUploadJobId(null)
        setSelectedOption(null)
    }


    const canUseAI = subscriptionStatus?.is_active && (subscriptionStatus?.ai_limit > subscriptionStatus?.ai_used)

    useEffect(() => {
        if (selectedOption === 'ai' && canUseAI && styles.length === 0) {
            const fetchStyles = async () => {
                try {
                    const token = localStorage.getItem("accessToken") || ""
                    const response = await fetch(`${getBaseUrl()}api/ai/styles/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await response.json()
                    if (response.ok && Array.isArray(data)) {
                        setStyles(data)
                        if (data.length > 0) setSelectedStyle(data[0])
                    }
                } catch (err) {
                    console.error("Error fetching styles:", err)
                }
            }
            fetchStyles()
        }
    }, [selectedOption, canUseAI, styles.length])

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("accessToken") || localStorage.getItem("token") || ""
            const response = await fetch(`${getBaseUrl()}api/ai/history/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (response.ok) {
                setHistory(data)
            }
        } catch (err) {
            console.error("Error fetching history:", err)
        }
    }

    useEffect(() => {
        if (aiType === 'history') {
            fetchHistory()
        }
    }, [aiType])

    const handlePublish = async (historyId: number) => {
        setIsPublishing(true)
        setPublishStatus('idle')
        try {
            const response = await fetch(`${getBaseUrl().replace('/api/', '')}/api/ai/publish/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ history_id: historyId })
            })
            if (response.ok) {
                setPublishStatus('success')
                setTimeout(() => {
                    setPublishStatus('idle')
                    setSelectedHistoryItem(null)
                    setAiType('image') // Regresar o cerrar
                    onClose()
                }, 2000)
            } else {
                setPublishStatus('error')
            }
        } catch (error) {
            setPublishStatus('error')
            console.error('Error publishing:', error)
        } finally {
            setIsPublishing(false)
        }
    }

    const handleGenerate = async () => {
        if (!prompt.trim()) return
        setLoading(true)
        setResult(null)

        try {
            const token = localStorage.getItem("accessToken") || localStorage.getItem("token") || ""
            const formData = new FormData()
            formData.append("prompt", prompt)
            formData.append("type", aiType === 'history' ? 'image' : aiType)
            if (selectedStyle) formData.append("style", selectedStyle.slug)
            if (selectedTemplate) formData.append("template_id", selectedTemplate.id.toString())
            if (referenceImage) formData.append("reference_image", referenceImage)

            const response = await fetch(`${getBaseUrl()}api/ai/generate/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            const data = await response.json()
            if (!response.ok) {
                setResult({ error: data.error || 'Error al generar contenido' })
            } else {
                setResult({ url: data.media_url, credits: data.credits_remaining })
                setPrompt("")
                setReferenceImage(null)
                setSelectedTemplate(null)
                fetchHistory()
            }
        } catch (error) {
            setResult({ error: "Error de conexión con el servidor" })
        } finally {
            setLoading(false)
        }
    }

    const resetAIFlow = () => {
        setPrompt("")
        setReferenceImage(null)
        setResult(null)
        setSelectedTemplate(null)
        setSelectedOption(null)
    }

    const handleSelectTemplate = (template: AITemplate) => {
        setSelectedTemplate(template)
        setPrompt(template.prompt)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-[#050505]/95 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0f111a] border-t border-white/5 rounded-t-[40px] p-6 pb-safe max-h-[100vh] overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex justify-center mb-6 pt-2">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full" />
                        </div>

                        {selectedOption === 'ai' && canUseAI ? (
                            <div className="relative mb-6 text-center">
                                <button
                                    onClick={resetAIFlow}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">IMAGINA AI</h2>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between mb-8 px-2">
                                <h2 className="text-2xl font-black text-white tracking-tight">Crear Contenido</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {!selectedOption ? (
                            <div className="grid grid-cols-1 gap-4 px-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedOption('upload')}
                                    className="group relative flex items-center gap-5 p-6 rounded-[28px] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 hover:border-cyan-500/30 transition-all overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-cyan-500/10 text-cyan-400 group-hover:scale-110 shadow-lg shadow-cyan-500/5 transition-transform">
                                        <Upload size={32} />
                                    </div>
                                    <div className="relative flex-1 text-left">
                                        <h3 className="text-xl font-bold text-white mb-1">Subir Video</h3>
                                        <p className="text-sm text-gray-400 leading-snug">Comparte tus momentos reales con la comunidad</p>
                                    </div>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedOption('ai')}
                                    className="group relative flex items-center gap-5 p-6 rounded-[28px] bg-gradient-to-br from-[#7000ff]/10 to-[#00f0ff]/10 border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 transition-all overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#7000ff]/20 to-[#00f0ff]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#7000ff] to-[#00f0ff] text-white group-hover:scale-110 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-transform">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="relative flex-1 text-left">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-white">Generar con IA</h3>
                                            <span className="bg-gradient-to-r from-[#7000ff] to-[#00f0ff] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg">NUEVO</span>
                                        </div>
                                        <p className="text-sm text-gray-400 leading-snug">Usa la nueva interfaz IMAGINA AI interactiva</p>
                                    </div>
                                </motion.button>
                            </div>
                        ) : selectedOption === 'ai' ? (
                            <div className="space-y-4 px-1">
                                {!canUseAI ? (
                                    <>
                                        <button
                                            onClick={() => setSelectedOption(null)}
                                            className="text-gray-400 text-sm font-bold flex items-center gap-1 hover:text-white transition-colors mb-6"
                                        >
                                            ← Volver al inicio
                                        </button>
                                        <div className="p-8 rounded-[32px] bg-amber-500/10 border border-amber-500/20 text-center relative overflow-hidden">
                                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl" />
                                            <AlertCircle className="relative mx-auto text-amber-500 mb-5 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" size={56} />
                                            <h3 className="relative text-2xl font-black text-white mb-2 tracking-tight">VIP Requerido</h3>
                                            <p className="relative text-amber-100/70 text-[15px] mb-8 leading-relaxed max-w-sm mx-auto">
                                                Para usar IMAGINA AI necesitas un plan de suscripción activo con créditos disponibles.
                                            </p>
                                            <button className="relative w-full py-4 bg-gradient-to-r from-amber-400 to-amber-600 rounded-2xl text-black font-black text-lg shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-95 transition-all">
                                                Ver Planes de Suscripción
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{subscriptionStatus.plan_name} ACTIVE</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-400">
                                                <span className="text-[#00f0ff] font-bold">{result?.credits ?? (subscriptionStatus.ai_limit - subscriptionStatus.ai_used)}</span> créditos
                                            </div>
                                        </div>

                                        <div className="flex bg-[#1a1c29]/80 border border-white/5 rounded-[18px] p-1 shadow-inner">
                                            <button
                                                onClick={() => setAiType('image')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-xs font-bold transition-all ${aiType === 'image' ? 'bg-[#2a2d3e] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Imagen
                                            </button>
                                            <button
                                                onClick={() => setAiType('video')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-xs font-bold transition-all ${aiType === 'video' ? 'bg-[#2a2d3e] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Video
                                            </button>
                                            <button
                                                onClick={() => setAiType('history')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-xs font-bold transition-all ${aiType === 'history' ? 'bg-[#2a2d3e] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Historial
                                            </button>
                                        </div>

                                        {(aiType === 'image' || aiType === 'video') ? (
                                            <>
                                                <div>
                                                    <label className="block text-[13px] text-gray-400 mb-1.5 px-1 uppercase tracking-wider font-bold">Prompt</label>
                                                    <div className="relative">
                                                        <textarea
                                                            value={prompt}
                                                            onChange={(e) => setPrompt(e.target.value)}
                                                            className="w-full h-[100px] bg-[#1a1c29] border border-[#3b4b8a]/30 hover:border-[#3b4b8a]/60 rounded-[18px] p-4 text-white text-[14px] placeholder:text-gray-600 focus:outline-none focus:border-[#4d7efd] focus:ring-1 focus:ring-[#4d7efd] transition-all resize-none shadow-inner"
                                                            placeholder={aiType === 'image' ? "Un paisaje cyberpunk..." : "Un astronauta caminando en Marte..."}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-3 bg-[#1a1c29] rounded-[24px] p-3.5 border border-white/5">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2 text-white/90">
                                                            <SlidersHorizontal size={16} className="text-gray-400" />
                                                            <span className="font-bold text-[13px] uppercase tracking-wider">Opciones de Estilo</span>
                                                        </div>
                                                        <button className="text-gray-400 hover:text-white transition-colors">
                                                            <ChevronDown size={18} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-2">
                                                        {styles.map(style => (
                                                            <button
                                                                key={style.id}
                                                                onClick={() => {
                                                                    setSelectedStyle(style)
                                                                    setSelectedTemplate(null)
                                                                }}
                                                                className="flex flex-col items-center gap-1.5 group"
                                                            >
                                                                <div className={`w-14 h-14 rounded-[16px] border-2 flex items-center justify-center transition-all duration-300 ${selectedStyle?.id === style.id ? 'border-[#4d7efd] shadow-[0_0_15px_rgba(77,126,253,0.3)] scale-105' : `border-transparent bg-[#2a2d3e] ${style.color_border}`}`}>
                                                                    <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${style.color_bg} ${style.color_text}`}>
                                                                        {getIcon(style.icon_name)}
                                                                    </div>
                                                                </div>
                                                                <span className={`text-[11px] font-bold tracking-tight ${selectedStyle?.id === style.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`}>{style.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Templates Carousel */}
                                                    {selectedStyle && selectedStyle.templates.length > 0 && (
                                                        <div className="mt-3 pt-2 border-t border-white/5">
                                                            <div className="flex items-center gap-2 mb-2.5">
                                                                <Sparkles size={12} className="text-[#4d7efd]" />
                                                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Plantillas {selectedStyle.name}</span>
                                                            </div>
                                                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                                                                {selectedStyle.templates.map(template => (
                                                                    <motion.button
                                                                        key={template.id}
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        onClick={() => handleSelectTemplate(template)}
                                                                        className={`relative flex-shrink-0 w-[90px] h-[120px] rounded-[14px] overflow-hidden border-2 transition-all ${selectedTemplate?.id === template.id ? 'border-[#4d7efd] shadow-[0_0_15px_rgba(77,126,253,0.4)]' : 'border-white/10'}`}
                                                                    >
                                                                        <img
                                                                            src={template.image_url}
                                                                            alt={template.title}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5">
                                                                            <span className="text-[9px] font-bold text-white leading-tight block truncate tracking-tight">{template.title}</span>
                                                                        </div>
                                                                        {selectedTemplate?.id === template.id && (
                                                                            <div className="absolute top-1.5 right-1.5 bg-[#4d7efd] rounded-full p-1 shadow-lg">
                                                                                <CheckCircle2 size={10} className="text-white" />
                                                                            </div>
                                                                        )}
                                                                    </motion.button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-4 text-center px-1">
                                                    <div className="flex justify-center">
                                                        <input type="file" id="ref-image" className="hidden" accept="image/*" onChange={(e) => setReferenceImage(e.target.files?.[0] || null)} />
                                                        <label
                                                            htmlFor="ref-image"
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1c29] border border-dashed border-[#4d7efd]/50 text-[#4d7efd] text-xs font-bold cursor-pointer hover:bg-[#4d7efd]/10 transition-colors"
                                                        >
                                                            <ImagePlus size={14} />
                                                            {referenceImage ? <span className="truncate max-w-[120px]">{referenceImage.name}</span> : "+ Agregar imagen de referencia"}
                                                        </label>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <button className="text-gray-500 text-[11px] font-bold flex items-center justify-center gap-1.5 mx-auto hover:text-gray-300 transition-colors uppercase tracking-wider">
                                                            <HelpCircle size={12} />
                                                            <span>Ayuda con prompt y negativo</span>
                                                        </button>

                                                        <button className="text-[#6c5dd3]/80 text-[12px] font-bold mx-auto hover:text-[#8e82f5] transition-colors uppercase tracking-widest">
                                                            + Opciones Avanzadas
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedHistoryItem ? (
                                                    <div className="space-y-4">
                                                        <button
                                                            onClick={() => setSelectedHistoryItem(null)}
                                                            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider mb-2"
                                                        >
                                                            ← Volver al Historial
                                                        </button>
                                                        <div className="rounded-[24px] overflow-hidden bg-black/40 border border-white/5 aspect-square flex items-center justify-center relative">
                                                            {selectedHistoryItem.media_type === 'video' ? (
                                                                <video
                                                                    src={selectedHistoryItem.media_url}
                                                                    controls
                                                                    className="w-full h-full object-contain"
                                                                    autoPlay
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={selectedHistoryItem.media_url}
                                                                    alt={selectedHistoryItem.prompt}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="p-4 rounded-[20px] bg-[#1a1c29] border border-white/5">
                                                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Prompt Utilizado</h4>
                                                            <p className="text-sm text-gray-200 leading-relaxed italic">"{selectedHistoryItem.prompt}"</p>
                                                            <div className="flex justify-between items-center mt-3">
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date(selectedHistoryItem.created_at).toLocaleDateString()}</span>
                                                                <button
                                                                    onClick={() => handlePublish(selectedHistoryItem.id)}
                                                                    disabled={isPublishing || publishStatus === 'success'}
                                                                    className={`
                                                                        px-6 py-2 rounded-full text-[13px] font-black transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.2)]
                                                                        ${publishStatus === 'success'
                                                                            ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                                                            : 'bg-[#00f0ff] text-black hover:bg-[#00f0ff]/80 active:scale-95'
                                                                        }
                                                                        disabled:opacity-50 disabled:cursor-not-allowed
                                                                    `}
                                                                >
                                                                    {isPublishing ? (
                                                                        <>
                                                                            <Loader2 className="animate-spin" size={14} />
                                                                            Publicando...
                                                                        </>
                                                                    ) : publishStatus === 'success' ? (
                                                                        <>
                                                                            <CheckCircle2 size={14} />
                                                                            ¡Publicado!
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            Publicar
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        {loading && (
                                                            <div className="mb-8 space-y-4">
                                                                <div className="flex items-center justify-between px-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                                                                        <span className="text-[11px] font-black text-[#00f0ff] uppercase tracking-[0.2em] animate-pulse">Generando Magia</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                                                                        <Loader2 className="animate-spin text-[#00f0ff]" size={10} />
                                                                        <span className="text-[9px] font-bold text-[#00f0ff] uppercase tracking-wider">Wait</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-3 overflow-hidden px-1">
                                                                    {/* Skeleton Card 1 */}
                                                                    <div className="relative flex-shrink-0 w-[140px] aspect-[9/12] rounded-[24px] bg-[#1a1c29] border border-white/5 overflow-hidden group">
                                                                        <div className="absolute inset-0 animate-shimmer" />
                                                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                                                                <Video size={24} className="text-white/10" />
                                                                            </div>
                                                                            <div className="space-y-2 flex flex-col items-center">
                                                                                <div className="h-1.5 w-16 bg-white/5 rounded-full" />
                                                                                <div className="h-1 w-10 bg-white/5 rounded-full opacity-50" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="absolute bottom-3 left-3 right-3 h-6 rounded-xl bg-white/5 border border-white/5" />
                                                                    </div>

                                                                    {/* Skeleton Card 2 (Partial/Fade) */}
                                                                    <div className="relative flex-shrink-0 w-[140px] aspect-[9/12] rounded-[24px] bg-[#1a1c29]/50 border border-white/5 overflow-hidden opacity-40">
                                                                        <div className="absolute inset-0 animate-shimmer opacity-30" />
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <ImageIcon size={24} className="text-white/5" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="space-y-6">
                                                            {/* Vídeos Carousel */}
                                                            <div>
                                                                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 px-1">Mis Videos</h4>
                                                                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                                                                    {history.filter(item => item.media_type === 'video').length > 0 ? (
                                                                        history.filter(item => item.media_type === 'video').map(item => (
                                                                            <button
                                                                                key={item.id}
                                                                                onClick={() => setSelectedHistoryItem(item)}
                                                                                className="relative flex-shrink-0 w-[140px] aspect-[9/12] rounded-[20px] overflow-hidden bg-[#1a1c29] border border-white/5 group"
                                                                            >
                                                                                <Video className="absolute top-2 right-2 text-white/50 z-10" size={16} />
                                                                                <video
                                                                                    src={item.media_url}
                                                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                                                />
                                                                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                                                    <p className="text-[9px] text-white/70 truncate">{item.prompt}</p>
                                                                                </div>
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="w-full py-10 rounded-[20px] border border-dashed border-white/5 flex flex-center text-center">
                                                                            <p className="text-[11px] text-gray-600 font-bold uppercase w-full">Sin videos aún</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Imágenes Carousel */}
                                                            <div>
                                                                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 px-1">Mis Imágenes</h4>
                                                                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                                                                    {history.filter(item => item.media_type === 'image').length > 0 ? (
                                                                        history.filter(item => item.media_type === 'image').map(item => (
                                                                            <button
                                                                                key={item.id}
                                                                                onClick={() => setSelectedHistoryItem(item)}
                                                                                className="relative flex-shrink-0 w-[120px] aspect-square rounded-[20px] overflow-hidden bg-[#1a1c29] border border-white/5 group"
                                                                            >
                                                                                <ImageIcon className="absolute top-2 right-2 text-white/50 z-10" size={16} />
                                                                                <img
                                                                                    src={item.media_url}
                                                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                                                />
                                                                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                                                    <p className="text-[9px] text-white/70 truncate">{item.prompt}</p>
                                                                                </div>
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="w-full py-10 rounded-[20px] border border-dashed border-white/5 flex flex-center text-center">
                                                                            <p className="text-[11px] text-gray-600 font-bold uppercase w-full">Sin imágenes aún</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {result?.error && (
                                            <div className="mt-2 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                                <AlertCircle className="text-red-500 shrink-0" size={20} />
                                                <p className="text-sm text-red-200">{result.error}</p>
                                            </div>
                                        )}

                                        {result?.url && (
                                            <div className="mt-2 p-4 rounded-[16px] bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                                                <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-green-400 mb-1">¡Generación Exitosa!</p>
                                                    <a href={result.url} target="_blank" rel="noreferrer" className="text-xs text-green-200 underline">Ver Resultado</a>
                                                </div>
                                            </div>
                                        )}

                                        {aiType !== 'history' && (
                                            <button
                                                onClick={handleGenerate}
                                                disabled={!prompt.trim() || loading}
                                                className="w-full mt-2 py-4 flex items-center justify-center gap-2 bg-gradient-to-r from-[#5961f9] to-[#ee9ae5] rounded-full text-white font-black text-[16px] tracking-wide shadow-[0_0_25px_rgba(238,154,229,0.4)] hover:shadow-[0_0_35px_rgba(238,154,229,0.6)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-none relative z-10"
                                            >
                                                {loading ? (
                                                    <><Loader2 className="animate-spin" size={22} /> GENERANDO...</>
                                                ) : (
                                                    <>GENERAR CREACIÓN ⚡</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 text-center py-2 px-1">
                                {!uploadFile ? (
                                    <div className="py-12">
                                        <button
                                            onClick={() => setSelectedOption(null)}
                                            className="text-gray-400 text-sm font-bold block mx-auto mb-8 hover:text-white transition-colors"
                                        >
                                            ← Volver al inicio
                                        </button>
                                        <div className="h-24 w-24 mx-auto rounded-[32px] bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                                            <Upload size={48} />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">Subir Nuevo Video</h3>
                                        <p className="text-gray-400 max-w-xs mx-auto mb-10 leading-relaxed text-[15px]">Selecciona un archivo de tu dispositivo para compartirlo con la comunidad de Buzzy.</p>
                                        <input
                                            type="file"
                                            id="video-upload"
                                            className="hidden"
                                            accept="video/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setUploadFile(e.target.files[0])
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="video-upload"
                                            className="block w-full py-4 bg-white text-black rounded-[20px] font-black text-lg cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all text-center"
                                        >
                                            Seleccionar Archivo
                                        </label>
                                    </div>
                                ) : (
                                    <div className="relative text-left flex flex-col pt-2 max-w-lg mx-auto">
                                        {/* HEADER */}
                                        <div className="flex items-center justify-between mb-5 px-4">
                                            <h2 className="text-xl font-bold text-white/90 tracking-tight">Estación Pro de Creación</h2>
                                            <button
                                                onClick={() => {
                                                    if (uploadStatus !== 'processing' && uploadStatus !== 'pending') {
                                                        setUploadFile(null)
                                                    }
                                                }}
                                                className="p-2 rounded-full bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50 backdrop-blur-md border border-white/10"
                                                disabled={uploadStatus === 'processing' || uploadStatus === 'pending'}
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-5 h-full relative px-1 pb-10">
                                            {/* PREVIEW SECTION WITH FLOATING BAR */}
                                            <div className="relative group">
                                                <div className="relative w-full aspect-[16/9] bg-black/40 rounded-[32px] overflow-hidden shadow-2xl border border-white/10 backdrop-blur-sm">
                                                    <video
                                                        src={uploadPreview}
                                                        className="w-full h-full object-cover"
                                                        autoPlay
                                                        loop
                                                        muted
                                                    />

                                                    {/* PLAYBACK OVERLAY */}
                                                    <div className="absolute inset-0 bg-black/20 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="flex items-center gap-8">
                                                            <button className="text-white/60 hover:text-white transition-colors"><ChevronDown className="rotate-90" size={28} /></button>
                                                            <button className="h-16 w-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 hover:scale-110 transition-transform">
                                                                <Play size={32} className="text-white fill-white ml-1" />
                                                            </button>
                                                            <button className="text-white/60 hover:text-white transition-colors"><ChevronDown className="-rotate-90" size={28} /></button>
                                                        </div>
                                                    </div>

                                                    {/* BOTTOM CONTROLS */}
                                                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/60 to-transparent">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
                                                                <div className="h-full bg-cyan-400 w-1/3 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                                                            </div>
                                                            <VolumeX size={20} className="text-white/80" />
                                                        </div>
                                                    </div>

                                                    {/* UPLOAD STATUS OVERLAY */}
                                                    <AnimatePresence>
                                                        {(uploadStatus === 'pending' || uploadStatus === 'processing' || uploadStatus === 'blocked' || uploadStatus === 'error') && (
                                                            <motion.div
                                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                                className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center"
                                                            >
                                                                {uploadStatus === 'processing' || uploadStatus === 'pending' ? (
                                                                    <>
                                                                        <div className="w-16 h-16 relative mb-4">
                                                                            <div className="absolute inset-0 border-4 border-[#00f0ff]/20 rounded-full"></div>
                                                                            <div className="absolute inset-0 border-4 border-[#00f0ff] border-t-transparent rounded-full animate-spin"></div>
                                                                            <Sparkles className="absolute inset-0 m-auto text-[#00f0ff] animate-pulse" size={24} />
                                                                        </div>
                                                                        <h3 className="text-white font-black text-lg mb-2">Procesando con Buzzy IA</h3>
                                                                        <p className="text-xs text-gray-400 max-w-[200px]">Optimizando visualización y moderando contenido...</p>
                                                                    </>
                                                                ) : uploadStatus === 'blocked' ? (
                                                                    <>
                                                                        <AlertCircle className="text-red-500 mb-4" size={48} />
                                                                        <h3 className="text-red-500 font-black text-lg mb-2">Contenido Bloqueado</h3>
                                                                        <p className="text-sm text-red-200">{safetyLabel}</p>
                                                                        <button onClick={handleCloseCreation} className="mt-6 bg-white/10 px-6 py-2 rounded-full font-bold text-xs border border-white/10 transition-colors">Entendido</button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle className="text-amber-500 mb-4" size={48} />
                                                                        <h3 className="text-amber-500 font-black text-lg mb-2">Error de Conexión</h3>
                                                                        <button onClick={() => setUploadStatus('idle')} className="mt-6 bg-white/10 px-6 py-2 rounded-full font-bold text-xs border border-white/10 transition-colors">Reintentar</button>
                                                                    </>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* FLOATING VERTICAL BAR (EXTERNAL LOOK) */}
                                                <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[60]">
                                                    <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[30px] p-2 flex flex-col gap-5 items-center shadow-2xl">
                                                        <button className="p-2 rounded-full text-white/80 hover:bg-white/10 transition-all hover:scale-110"><Music size={22} /></button>
                                                        <button className="p-2 rounded-full text-white/80 hover:bg-white/10 transition-all hover:scale-110"><AudioLines size={22} /></button>
                                                        <button className="p-2 rounded-full text-white/60 hover:bg-white/10 transition-all hover:scale-110"><Mic size={22} /></button>
                                                        <button className="p-2 rounded-full text-white/60 hover:bg-white/10 transition-all hover:scale-110"><Type size={22} /></button>
                                                        <button className="p-2 rounded-full text-cyan-400 hover:bg-cyan-500/20 transition-all hover:scale-110"><Wand2 size={22} /></button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* HERRAMIENTAS CREATIVAS */}
                                            <div className="space-y-3">
                                                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider px-2">Herramientas Creativas</h3>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <button className="flex flex-col items-center justify-center p-4 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors gap-2">
                                                        <div className="bg-black/40 p-2 rounded-full border border-white/5"><Music className="text-white" size={20} /></div>
                                                        <span className="text-[10px] font-bold text-gray-300">Música de Fondo</span>
                                                    </button>
                                                    <button className="flex flex-col items-center justify-center p-4 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors gap-2">
                                                        <div className="bg-black/40 p-2 rounded-full border border-white/5"><AudioLines className="text-white" size={20} /></div>
                                                        <span className="text-[10px] font-bold text-gray-300">Efectos de Audio</span>
                                                    </button>
                                                    <button className="flex flex-col items-center justify-center p-4 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors gap-2">
                                                        <div className="bg-black/40 p-2 rounded-full border border-white/5"><Mic className="text-white" size={20} /></div>
                                                        <span className="text-[10px] font-bold text-gray-300">Voz en Off</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* DESCRIPTION BOX */}
                                            <div className="bg-white/5 rounded-[28px] p-5 border border-white/10 backdrop-blur-md">
                                                <div className="flex items-center justify-between mb-3 text-gray-400">
                                                    <span className="text-[12px] font-bold uppercase tracking-wider">Descripción rápida...</span>
                                                    <div className="flex gap-2">
                                                        <span className="bg-white/5 px-3 py-1 rounded-lg text-[10px] font-bold border border-white/5 text-gray-400 hover:text-white cursor-pointer">#</span>
                                                        <span className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold border border-white/5 text-gray-400 hover:text-white cursor-pointer select-none opacity-40">#fww</span>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={uploadDescription}
                                                    onChange={(e) => setUploadDescription(e.target.value)}
                                                    className="w-full bg-transparent text-[14px] text-white/90 placeholder:text-gray-600 focus:outline-none resize-none font-medium leading-relaxed"
                                                    rows={3}
                                                    placeholder="Escribe algo increíble..."
                                                />
                                            </div>

                                            {/* SYNC SECTION */}
                                            <div className="space-y-4">
                                                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider px-2">Sincronizar Publicación (Near-Online):</h3>

                                                <div className="space-y-2.5">
                                                    {/* INSTAGRAM */}
                                                    <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-full px-5 py-3 flex items-center justify-between shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10"><Instagram className="text-white" size={20} /></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-bold text-white">Sincronizar Instagram</span>
                                                                <span className="text-[11px] text-cyan-400/70 font-medium">(@rey_test)</span>
                                                            </div>
                                                        </div>
                                                        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full ${syncInstagram ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-white/10'}`}>
                                                            <span className={`text-[10px] font-black ${syncInstagram ? 'text-black' : 'text-gray-500'}`}>{syncInstagram ? 'ON' : 'OFF'}</span>
                                                            <button onClick={() => setSyncInstagram(!syncInstagram)} className={`w-8 h-4 rounded-full relative transition-colors ${syncInstagram ? 'bg-black/20' : 'bg-white/20'}`}>
                                                                <motion.div animate={{ x: syncInstagram ? 16 : 0 }} className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* TIKTOK */}
                                                    <div className="bg-white/5 border border-white/10 rounded-full px-5 py-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10"><Smartphone className="text-white" size={20} /></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-bold text-white">Sincronizar TikTok</span>
                                                                <span className="text-[11px] text-gray-500 font-medium">(@rey_tiktok)</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/10">
                                                            <span className="text-[10px] font-black text-gray-500">OFF</span>
                                                            <button onClick={() => setSyncTikTok1(!syncTikTok1)} className="w-8 h-4 rounded-full bg-white/20 relative">
                                                                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white/60 rounded-full" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* FOOTER BUTTONS */}
                                            <div className="flex items-center justify-between px-2 pt-2">
                                                <button className="px-8 py-2.5 rounded-full bg-white/10 border border-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors">Conectar</button>
                                                <button className="flex items-center gap-2 px-6 py-2.5 rounded-full text-gray-400 font-bold text-xs hover:text-white transition-colors uppercase tracking-widest">
                                                    Conectar Facebook <Facebook size={18} className="text-gray-500" />
                                                </button>
                                            </div>

                                            {/* PUBLISH ACTION */}
                                            <div className="pt-6">
                                                <button
                                                    onClick={handleVideoSubmit}
                                                    disabled={uploadStatus === 'pending' || uploadStatus === 'processing'}
                                                    className="w-full py-5 rounded-[24px] bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-black font-black text-[18px] tracking-tight shadow-[0_20px_40px_rgba(34,211,238,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
                                                >
                                                    {uploadStatus === 'pending' || uploadStatus === 'processing' ? (
                                                        <>
                                                            <Loader2 size={24} className="animate-spin" />
                                                            <span>PUBLICANDO...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>PUBLICAR ESTRENO</span>
                                                            <Sparkles size={22} className="group-hover:animate-bounce" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default CreateActionModal
