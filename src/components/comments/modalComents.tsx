import { AnimatePresence, motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { ChevronRight, Smile, X, Mic, Square, Play, Pause, Trash2, Send, ImageIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { allEmojis } from "./emojis"
import { CommentData } from "../index"
import { getMediaUrl } from "../../redux/client/api-client"
import { useAudioRecorder } from "../../hooks/useAudioRecorder"
import { pickMedia } from "../../hooks/useMediaPicker"

// EXTENDER COMENTARIO
type CommentWithReply = CommentData & {
    replies?: CommentWithReply[]
    parent?: { uuid: string }
    created_at?: string
    audio_url?: string | null
    audio_duration?: number | null
    image_url?: string | null
}

type Props = {
    showCommentsModal: boolean
    setShowCommentsModal: (value: boolean) => void
    comments: CommentWithReply[] | null
    user: { profile_picture: string }
    commentText: string
    setCommentText: React.Dispatch<React.SetStateAction<string>>
    handlePostComment: (parentUuid?: string, audioBlob?: Blob, audioDuration?: number, imageFile?: File) => void
    isOffline?: boolean
    onRetry?: () => void
}

// ── Audio comment player (for received comments) ──────────────────────────────
const PLAN_COLORS = {
    FRIEND: { btn: 'from-[#00c8ff] to-[#00f0ff]', bar: 'from-[#00c8ff] to-[#00f0ff]', glow: 'shadow-[#00f0ff]/30', track: 'bg-cyan-500/20', time: 'text-cyan-400/70' },
    PLUS:   { btn: 'from-purple-500 to-pink-500',   bar: 'from-purple-500 to-pink-400',  glow: 'shadow-purple-500/30', track: 'bg-purple-500/20', time: 'text-purple-400/70' },
    VIP:    { btn: 'from-amber-400 to-orange-400',  bar: 'from-amber-400 to-orange-300', glow: 'shadow-amber-400/30', track: 'bg-amber-400/20', time: 'text-amber-400/70' },
    NONE:   { btn: 'from-white/20 to-white/10',     bar: 'from-white/50 to-white/30',    glow: 'shadow-white/10',    track: 'bg-white/10', time: 'text-white/40' },
}

function AudioCommentPlayer({ url, duration, plan = 'NONE' }: { url: string; duration: number; plan?: string }) {
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const playerRef = useRef<HTMLAudioElement | null>(null)
    const colors = PLAN_COLORS[plan as keyof typeof PLAN_COLORS] ?? PLAN_COLORS.NONE

    const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

    const ensureAudio = () => {
        if (playerRef.current) return playerRef.current
        const audio = new Audio(url)
        audio.ontimeupdate = () => {
            setCurrentTime(audio.currentTime)
            setProgress(audio.currentTime / (audio.duration || duration || 1))
        }
        audio.onended = () => {
            setPlaying(false)
            setProgress(0)
            setCurrentTime(0)
        }
        playerRef.current = audio
        return audio
    }

    const toggle = () => {
        const audio = ensureAudio()
        if (playing) {
            audio.pause()
            setPlaying(false)
        } else {
            audio.play()
            setPlaying(true)
        }
    }

    return (
        <div className="flex items-center gap-2 mt-1.5 max-w-[220px]">
            {/* Play/Pause button */}
            <button
                onClick={toggle}
                className={`h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-tr ${colors.btn} shadow ${colors.glow} transition-transform active:scale-90`}
            >
                {playing
                    ? <Pause size={10} fill="white" className="text-white" />
                    : <Play  size={10} fill="white" className="text-white ml-[1px]" />
                }
            </button>

            {/* Bar + time */}
            <div className="flex-1 flex items-center gap-2">
                <div className={`flex-1 h-[3px] rounded-full ${colors.track} overflow-hidden`}>
                    <div
                        className={`h-full bg-gradient-to-r ${colors.bar} rounded-full`}
                        style={{ width: `${progress * 100}%`, transition: 'width 0.1s linear' }}
                    />
                </div>
                <span className={`text-[10px] font-mono flex-shrink-0 tabular-nums ${colors.time}`}>
                    {playing ? fmt(currentTime) : fmt(duration)}
                </span>
            </div>
        </div>
    )
}

export const ShowComments = ({
    showCommentsModal,
    setShowCommentsModal,
    comments,
    user,
    commentText,
    setCommentText,
    handlePostComment,
    isOffline = false,
    onRetry,
}: Props) => {
    const navigate = useNavigate()
    const { t } = useTranslation(['videos', 'common'])

    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [replyingTo, setReplyingTo] = useState<{ uuid: string; username: string } | null>(null)
    const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({})
    const [commentsTree, setCommentsTree] = useState<CommentWithReply[]>([])
    const MAX_REPLY_DEPTH = 1

    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const emojiButtonRef = useRef<HTMLButtonElement>(null)

    // Audio recorder
    const { state: recState, elapsed, recording, maxSeconds, startRecording, stopRecording, cancelRecording, reset: resetAudio } = useAudioRecorder()
    const [audioPlaying, setAudioPlaying] = useState(false)
    const [audioProgress, setAudioProgress] = useState(0)
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

    const truncateUsername = (username?: string) => {
        if (!username) return ""
        return username.length > 15 ? `${username.slice(0, 15)}...` : username
    }

    const buildCommentTree = (list: CommentWithReply[]) => {
        const map = new Map<string, CommentWithReply>();

        list.forEach(c => {
            map.set(c.uuid, { ...c, replies: [] });
        });

        const roots: CommentWithReply[] = [];

        map.forEach(comment => {
            const parentUuid = comment.parent?.uuid;

            if (parentUuid) {
                const parent = map.get(parentUuid);
                if (parent) {
                    parent.replies!.push(comment);
                } else {
                    roots.push(comment);
                }
            } else {
                roots.push(comment);
            }
        });

        const planOrder: { [key: string]: number } = {
            'FRIEND': 0,
            'PLUS': 1,
            'VIP': 2,
            'NONE': 3
        };

        const sortFn = (a: CommentWithReply, b: CommentWithReply) => {
            const aPlan = a.is_priority_comment ? (a.priority_plan_name?.toUpperCase() || 'NONE') : 'NONE';
            const bPlan = b.is_priority_comment ? (b.priority_plan_name?.toUpperCase() || 'NONE') : 'NONE';

            const aPriority = planOrder[aPlan] ?? 4;
            const bPriority = planOrder[bPlan] ?? 4;

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            // Si tienen la misma prioridad, por fecha (más nuevos primero)
            const bDate = b.created_at || b.create_at;
            const aDate = a.created_at || a.create_at;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
        };

        // Ordenar raíces
        roots.sort(sortFn);

        // Ordenar respuestas de cada comentario recursivamente
        const sortReplies = (comment: CommentWithReply) => {
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.sort(sortFn);
                comment.replies.forEach(sortReplies);
            }
        };
        roots.forEach(sortReplies);

        return roots;
    };


    // Ejecutar el árbol cuando lleguen los comentarios del backend
    useEffect(() => {
        if (!comments) {
            setCommentsTree([])  // limpiar al abrir nuevo video
            return
        }
        if (comments.length > 0) {
            setCommentsTree(buildCommentTree(comments))
        } else {
            setCommentsTree([])
        }
    }, [comments]);

    // ---------------------------------
    // EMOJIS
    // ---------------------------------
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(e.target as Node) &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(e.target as Node)
            ) {
                setShowEmojiPicker(false)
            }
        }

        if (showEmojiPicker) document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [showEmojiPicker])

    const handleEmojiSelect = (emoji: string) => {
        setCommentText((prev: string) => prev + emoji)
    }

    // ---------------------------------
    // RESPONDER
    // ---------------------------------
    const handleReply = (uuid: string, username: string) => {
        setReplyingTo({ uuid, username })
        setCommentText(`@${username} `)
        document.querySelector("input")?.focus()
    }

    const cancelReply = () => {
        setReplyingTo(null)
        setCommentText("")
    }

    const sendComment = () => {
        const replyPrefix = replyingTo ? `@${replyingTo.username} ` : ''
        const realText = commentText.startsWith(replyPrefix)
            ? commentText.slice(replyPrefix.length)
            : commentText
        if (!realText.trim() && !recording && !imageFile) return
        if (recording) {
            handlePostComment(replyingTo?.uuid || undefined, recording.blob, recording.duration)
            resetAudio()
        } else {
            handlePostComment(replyingTo?.uuid || undefined, undefined, undefined, imageFile ?? undefined)
        }
        setCommentText("")
        setReplyingTo(null)
        setImageFile(null)
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl)
            setImagePreviewUrl(null)
        }
    }

    // ---------------------------------
    // AUDIO HELPERS
    // ---------------------------------
    const toggleAudioPlay = () => {
        if (!recording) return
        if (!audioPlayerRef.current) {
            audioPlayerRef.current = new Audio(recording.url)
            audioPlayerRef.current.ontimeupdate = () => {
                const el = audioPlayerRef.current!
                setAudioProgress(el.currentTime / el.duration)
            }
            audioPlayerRef.current.onended = () => {
                setAudioPlaying(false)
                setAudioProgress(0)
            }
        }
        if (audioPlaying) {
            audioPlayerRef.current.pause()
            setAudioPlaying(false)
        } else {
            audioPlayerRef.current.play()
            setAudioPlaying(true)
        }
    }

    const handleDiscardAudio = () => {
        audioPlayerRef.current?.pause()
        audioPlayerRef.current = null
        setAudioPlaying(false)
        setAudioProgress(0)
        cancelRecording()
    }

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    const toggleReplies = (uuid: string) => {
        setOpenReplies(prev => ({
            ...prev,
            [uuid]: !prev[uuid]
        }))
    }

    const goToProfile = (username?: string) => {
        if (!username) return
        setShowCommentsModal(false)
        navigate(`/profile/${username}`)
    }

    // ---------------------------------
    // COMPONENTE RECURSIVO
    // ---------------------------------
    const renderComment = (comment: CommentWithReply, depth = 0) => {
        const hasReplies = comment.replies && comment.replies.length > 0
        const isOpen = openReplies[comment.uuid]
        const planName = comment.is_priority_comment ? (comment.priority_plan_name?.toUpperCase() || 'NONE') : 'NONE'
        const visualDepth = Math.min(depth, MAX_REPLY_DEPTH)
        const canReply = visualDepth < MAX_REPLY_DEPTH

        let itemClasses = `py-1 px-3 rounded-2xl transition-all duration-300 mb-3 ${visualDepth > 0 ? "border-l border-white/10 pl-4 mt-1" : "border border-white/10 bg-white/5"}`
        let avatarBorder = "border-2 border-black"
        let nameColor = "text-white"
        let bgEffect = ""

        if (visualDepth === 1) {
            itemClasses += " ml-10"
        } else if (visualDepth >= 2) {
            itemClasses += " ml-16"
        }

        if (planName === 'FRIEND') {
            itemClasses += " bg-gradient-to-r from-cyan-500/14 via-blue-600/8 to-transparent border-cyan-400/25 shadow-[0_4px_15px_rgba(0,240,255,0.14)]"
            avatarBorder = "border-2 border-[#00f0ff]"
            nameColor = "text-cyan-400"
            bgEffect = "FRIEND"
        } else if (planName === 'PLUS') {
            itemClasses += " bg-gradient-to-r from-purple-500/12 via-pink-600/8 to-transparent border-purple-400/25 shadow-[0_4px_15px_rgba(168,85,247,0.12)]"
            avatarBorder = "border-2 border-purple-500"
            nameColor = "text-purple-400"
            bgEffect = "PLUS"
        } else if (planName === 'VIP') {
            itemClasses += " bg-gradient-to-r from-amber-400/12 via-orange-500/8 to-transparent border-amber-400/25 shadow-[0_4px_15px_rgba(251,191,36,0.10)]"
            avatarBorder = "border-2 border-amber-400"
            nameColor = "text-amber-400"
            bgEffect = "VIP"
        }

        return (
            <motion.div
                key={comment.uuid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={itemClasses}
            >
                <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0 group">
                        <div className={`p-[1.5px] rounded-full transition-transform duration-500 group-hover:scale-110 ${planName === 'FRIEND' ? 'bg-gradient-to-tr from-[#00f0ff] via-white to-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.4)]' :
                            planName === 'VIP' ? 'bg-gradient-to-tr from-amber-300 via-white to-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.3)]' :
                                planName === 'PLUS' ? 'bg-gradient-to-tr from-purple-400 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-white/10'
                            }`}>
                            <img
                                src={getMediaUrl(comment.user_id.profile_picture) || getMediaUrl("profile_pics/avatar.webp")}
                                alt={comment.user_id.username}
                                className={`h-11 w-11 rounded-full object-cover ${avatarBorder}`}
                            />
                        </div>

                        {bgEffect !== '' && (
                            <div className="absolute -bottom-1 -right-1  scale-75">
                                <motion.span
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter border shadow-lg flex items-center gap-0.5 ${planName === 'FRIEND' ? 'bg-cyan-500 text-black border-cyan-300' :
                                        planName === 'VIP' ? 'bg-amber-400 text-black border-amber-200' :
                                            'bg-purple-600 text-white border-purple-400'
                                        }`}
                                >
                                    {bgEffect}
                                </motion.span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline gap-2 mb-1">
                            <button
                                type="button"
                                onClick={() => goToProfile(comment.user_id.username)}
                                className={`font-bold text-sm ${nameColor} hover:opacity-80 transition-opacity text-left`}
                            >
                                {truncateUsername(comment.user_id.username)}
                            </button>
                            <span className="text-[10px] text-gray-500 font-medium">
                                {new Date(comment.created_at || comment.create_at).toLocaleDateString()}
                            </span>
                        </div>
                        {comment.audio_url ? (
                            <AudioCommentPlayer url={comment.audio_url} duration={comment.audio_duration ?? 0} plan={planName} />
                        ) : (
                            <>
                                {comment.content ? (
                                    <p className="text-sm leading-relaxed text-gray-200 break-words">
                                        {comment.content}
                                    </p>
                                ) : null}
                                {comment.image_url ? (
                                    <img
                                        src={getMediaUrl(comment.image_url)}
                                        alt="imagen"
                                        className="mt-1 max-h-48 max-w-[240px] rounded-xl object-cover border border-white/10"
                                    />
                                ) : null}
                            </>
                        )}

                        {canReply && (
                                <div className="flex items-center gap-5 mt-2 text-xs">
                                <button
                                    onClick={() => handleReply(comment.uuid, comment.user_id.username)}
                                    className="font-medium hover:text-white transition-colors"
                                >
                                    {t('videos:comments.reply')}
                                </button>
                            </div>
                        )}

                        {hasReplies && (
                            <button
                                className="mt-2 text-xs text-[#8b9cff] hover:text-white"
                                onClick={() => toggleReplies(comment.uuid)}
                            >
                                {isOpen
                                    ? t('videos:comments.hideReplies')
                                    : t('videos:comments.viewReplies', { count: comment.replies!.length })}
                                <div className="x1xp9za0 x1q0q8m5 xso031l xbmvrgn x17z2i9w"></div>
                            </button>
                        )}
                    </div>

                </div>

                {hasReplies && isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                    >
                        {comment.replies!.map(r => renderComment(r, depth + 1))}
                    </motion.div>
                )}
            </motion.div>
        )
    }

    // ---------------------------------
    // UI
    // ---------------------------------
    return (
        <AnimatePresence>
            {showCommentsModal && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[60]"
                        onClick={() => setShowCommentsModal(false)}
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 h-[65vh] z-[70] flex flex-col bg-[#050718] rounded-t-[2rem] border-t border-white/10 backdrop-blur-sm shadow-[0_-20px_80px_rgba(0,0,0,0.45)] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Rayita — click para cerrar */}
                        <div className="flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setShowCommentsModal(false)}>
                            <div className="h-1.5 w-14 rounded-full bg-white/40 hover:bg-white/70 transition-colors" />
                        </div>

                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                            <div>
                                <h3 className="text-white font-bold text-lg">{t('videos:comments.title')}</h3>
                                <p className="text-xs text-white/45">{t('videos:comments.subtitle')}</p>
                            </div>
                            {/* Contador de comentarios en lugar del X */}
                            <div className="flex flex-col items-center">
                                <span className="text-white font-bold text-lg leading-none">
                                    {comments ? comments.length : 0}
                                </span>
                                <span className="text-white/40 text-[10px]">comentarios</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 custom-scrollbar">
                            {isOffline ? (
                                <div className="flex flex-col justify-center items-center py-20 text-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                                        <svg className="w-7 h-7 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" strokeLinecap="round" strokeLinejoin="round"/>
                                            <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-white/70 font-semibold">Sin conexión a internet</h3>
                                    <p className="text-white/35 text-sm max-w-[220px]">No se pueden cargar los comentarios en este momento.</p>
                                    {onRetry && (
                                        <button
                                            onClick={onRetry}
                                            className="mt-2 px-6 py-2.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 text-sm font-semibold active:scale-95 transition-transform"
                                        >
                                            Reintentar
                                        </button>
                                    )}
                                </div>
                            ) : !commentsTree.length ? (
                                <div className="flex flex-col justify-center items-center py-20 text-center gap-2">
                                    <div className="h-14 w-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                                        <Smile size={24} className="text-white/20" />
                                    </div>
                                    <h3 className="text-white/70 font-medium">{t('videos:comments.emptyTitle')}</h3>
                                    <p className="text-white/35 text-sm max-w-[220px]">{t('videos:comments.emptyHint')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {commentsTree.map(c => renderComment(c))}
                                </div>
                            )}
                        </div>

                        {/* INPUT AREA */}
                        <div className="absolute bottom-0 left-0 right-0 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-[#050718]">
                            <AnimatePresence>
                                {replyingTo && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="flex items-center justify-between mb-3 text-xs bg-black border border-white/10 rounded-2xl px-4 py-2"
                                    >
                                        <div className="flex items-center gap-2 text-white/60">
                                            <span>{t('videos:comments.replyingTo')}</span>
                                            <span className="text-[#00f0ff] font-bold">@{replyingTo.username}</span>
                                        </div>
                                        <button onClick={cancelReply} className="text-white/40 hover:text-white p-1">
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Image preview */}
                            {imagePreviewUrl && (
                                <div className="relative inline-block mb-2 ml-11">
                                    <img src={imagePreviewUrl} alt="preview" className="h-16 w-16 rounded-xl object-cover border border-white/10" />
                                    <button
                                        onClick={() => { setImageFile(null); URL.revokeObjectURL(imagePreviewUrl); setImagePreviewUrl(null) }}
                                        className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-black border border-white/20 text-white/60 hover:text-white"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-end gap-2 w-full">
                                {/* Avatar */}
                                <img
                                    src={getMediaUrl(user.profile_picture)}
                                    alt="Yo"
                                    className="h-7 w-7 rounded-full object-cover border border-white/10 flex-shrink-0 mb-1"
                                />

                                <div className="relative flex-1">
                                    <AnimatePresence mode="wait">

                                        {/* ── ESTADO GRABANDO ── */}
                                        {recState === 'recording' && (
                                            <motion.div
                                                key="recording"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="flex items-center gap-3 bg-[#1a1f3a] border border-red-500/40 rounded-full px-4 py-2.5"
                                            >
                                                {/* Pulso rojo */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="h-3 w-3 rounded-full bg-red-500" />
                                                    <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-ping opacity-60" />
                                                </div>

                                                {/* Barra de tiempo */}
                                                <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                                                        style={{ width: `${(elapsed / maxSeconds) * 100}%` }}
                                                    />
                                                </div>

                                                <span className="text-red-400 text-xs font-mono font-bold flex-shrink-0">
                                                    {formatTime(elapsed)} / {formatTime(maxSeconds)}
                                                </span>

                                                {/* Detener */}
                                                <button
                                                    onClick={stopRecording}
                                                    className="h-8 w-8 flex items-center justify-center rounded-full bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0"
                                                >
                                                    <Square size={14} fill="currentColor" />
                                                </button>
                                            </motion.div>
                                        )}

                                        {/* ── ESTADO PREVIEW ── */}
                                        {recState === 'preview' && recording && (
                                            <motion.div
                                                key="preview"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                className="flex items-center gap-2.5 bg-[#0f1120] border border-white/8 rounded-2xl px-3 py-2.5"
                                            >
                                                {/* Play / Pause */}
                                                <button
                                                    onClick={toggleAudioPlay}
                                                    className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/20 transition-colors"
                                                >
                                                    {audioPlaying
                                                        ? <Pause size={13} fill="white" className="text-white" />
                                                        : <Play  size={13} fill="white" className="text-white ml-[1px]" />
                                                    }
                                                </button>

                                                {/* Barra + tiempo en la misma línea */}
                                                <div className="flex-1 flex items-center gap-2">
                                                    <div className="flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden">
                                                        <div
                                                            className="h-full bg-white/60 rounded-full"
                                                            style={{ width: `${audioProgress * 100}%`, transition: 'width 0.1s linear' }}
                                                        />
                                                    </div>
                                                    <span className="text-white/35 text-[10px] font-mono tabular-nums flex-shrink-0">
                                                        {formatTime(audioPlaying
                                                            ? (audioPlayerRef.current?.currentTime ?? 0)
                                                            : recording.duration)}
                                                    </span>
                                                </div>

                                                {/* Descartar */}
                                                <button
                                                    onClick={handleDiscardAudio}
                                                    className="flex-shrink-0 text-white/25 hover:text-red-400 transition-colors p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>

                                                {/* Enviar */}
                                                <button
                                                    onClick={sendComment}
                                                    className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/20 transition-colors"
                                                >
                                                    <Send size={13} className="text-white ml-[1px]" />
                                                </button>
                                            </motion.div>
                                        )}

                                        {/* ── ESTADO IDLE — input normal ── */}
                                        {recState === 'idle' && (
                                            <motion.div
                                                key="idle"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center bg-[#1a1f3a] border border-white/10 focus-within:border-[#00f0ff]/50 rounded-full overflow-hidden transition-all duration-300"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder={t('videos:comments.placeholder')}
                                                    value={commentText}
                                                    onChange={(e) => setCommentText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault()
                                                            sendComment()
                                                        }
                                                    }}
                                                    className="flex-1 bg-transparent pl-3 pr-1 py-2.5 text-white text-[13px] placeholder:text-white/30 focus:outline-none min-w-0"
                                                />

                                                <div className="flex items-center gap-1 pr-1">
                                                    {/* Galería */}
                                                    <button
                                                        onClick={async () => {
                                                            const picked = await pickMedia("image", 10);
                                                            if (!picked) return;
                                                            setImageFile(picked.file);
                                                            setImagePreviewUrl(picked.url);
                                                        }}
                                                        className="p-1.5 rounded-full hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                                                    >
                                                        <ImageIcon size={16} />
                                                    </button>

                                                    <button
                                                        ref={emojiButtonRef}
                                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                        className={`p-1.5 rounded-full transition-colors ${showEmojiPicker ? "bg-[#00f0ff]/10 text-[#00f0ff]" : "hover:bg-white/5 text-white/40"}`}
                                                    >
                                                        <Smile size={16} />
                                                    </button>

                                                    <AnimatePresence mode="popLayout">
                                                        {/* Mic: visible when no real text typed (or only the @mention prefix) */}
                                                        {(() => {
                                                            const replyPrefix = replyingTo ? `@${replyingTo.username} ` : ''
                                                            const realText = commentText.startsWith(replyPrefix)
                                                                ? commentText.slice(replyPrefix.length).trim()
                                                                : commentText.trim()
                                                            const hasRealText = realText.length > 0

                                                            return hasRealText ? (
                                                                <motion.button
                                                                    key="send"
                                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    exit={{ scale: 0.5, opacity: 0 }}
                                                                    onClick={sendComment}
                                                                    className="h-9 w-9 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#7000ff] to-[#00f0ff] text-white shadow-lg shadow-[#00f0ff]/20"
                                                                >
                                                                    <ChevronRight size={20} className="ml-0.5" />
                                                                </motion.button>
                                                            ) : (
                                                                <motion.button
                                                                    key="mic"
                                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    exit={{ scale: 0.5, opacity: 0 }}
                                                                    onClick={startRecording}
                                                                    className="h-9 w-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-[#00f0ff] hover:border-[#00f0ff]/40 transition-colors"
                                                                >
                                                                    <Mic size={18} />
                                                                </motion.button>
                                                            )
                                                        })()}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        )}

                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* EMOJI PICKER */}
                        {showEmojiPicker && (
                            <motion.div
                                ref={emojiPickerRef}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed bottom-32 left-6 right-6 mx-auto max-w-md bg-[#1a1a24]/95 backdrop-blur-sm border border-white/10 rounded-[32px] shadow-2xl overflow-hidden z-[80]"
                            >
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Emojis</h3>
                                    <button
                                        onClick={() => setShowEmojiPicker(false)}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-white/40"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="p-4 overflow-y-auto" style={{ maxHeight: "300px" }}>
                                    <div className="grid grid-cols-7 gap-1">
                                        {allEmojis.map((emoji, i) => (
                                            <motion.button
                                                key={i}
                                                whileTap={{ scale: 0.8 }}
                                                className="text-2xl h-11 w-11 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all"
                                                onClick={() => handleEmojiSelect(emoji)}
                                            >
                                                {emoji}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
