import { AnimatePresence, motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { ChevronRight, Smile, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { allEmojis } from "./emojis"
import { CommentData } from "../index"
import { getBaseUrl } from "../../redux/client/api-client"

// EXTENDER COMENTARIO
type CommentWithReply = CommentData & {
    replies?: CommentWithReply[]
    parent?: { uuid: string }
    created_at?: string
}

type Props = {
    showCommentsModal: boolean
    setShowCommentsModal: (value: boolean) => void
    comments: CommentWithReply[] | null
    user: { profile_picture: string }
    commentText: string
    setCommentText: React.Dispatch<React.SetStateAction<string>>
    handlePostComment: (parentUuid?: string) => void
}

export const ShowComments = ({
    showCommentsModal,
    setShowCommentsModal,
    comments,
    user,
    commentText,
    setCommentText,
    handlePostComment,
}: Props) => {
    const navigate = useNavigate()

    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [replyingTo, setReplyingTo] = useState<{ uuid: string; username: string } | null>(null)
    const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({})
    const [commentsTree, setCommentsTree] = useState<CommentWithReply[]>([])
    const MAX_REPLY_DEPTH = 1

    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const emojiButtonRef = useRef<HTMLButtonElement>(null)

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
    console.log(comments, "*-")

    // Ejecutar el árbol cuando lleguen los comentarios del backend
    useEffect(() => {
        if (comments && comments.length > 0) {
            const tree = buildCommentTree(comments);
            console.log(comments, "--------------------------------")
            setCommentsTree(tree);
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
        if (!commentText.trim()) return
        handlePostComment(replyingTo?.uuid || undefined)
        setCommentText("")
        setReplyingTo(null)
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

        let itemClasses = `py-4 px-3 rounded-2xl transition-all duration-300 mb-3 ${visualDepth > 0 ? "border-l border-white/10 pl-4 mt-1" : "border border-transparent"}`
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
                                src={`${getBaseUrl()}media/${comment.user_id.profile_picture || "profile_pics/avatar.webp"}`}
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
                        <p className="text-sm leading-relaxed text-gray-200 break-words">
                            {comment.content}
                        </p>

                        {canReply && (
                            <div className="flex items-center gap-5 mt-2 text-xs">
                                <button
                                    onClick={() => handleReply(comment.uuid, comment.user_id.username)}
                                    className="font-medium hover:text-white transition-colors"
                                >
                                    Responder
                                </button>
                            </div>
                        )}

                        {hasReplies && (
                            <button
                                className="mt-2 text-xs text-[#8b9cff] hover:text-white"
                                onClick={() => toggleReplies(comment.uuid)}
                            >
                                {isOpen ? "Ocultar respuestas" : `Ver ${comment.replies!.length} respuestas`}
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
                        className="fixed bottom-0 left-0 right-0 max-h-[72vh] z-[70] flex flex-col bg-[#08101f]/95 rounded-t-[2rem] border-t border-white/10 backdrop-blur-2xl shadow-[0_-20px_80px_rgba(0,0,0,0.45)] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3">
                            <div className="h-1.5 w-14 rounded-full bg-white/15" />
                        </div>

                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                            <div>
                                <h3 className="text-white font-bold text-lg">Comentarios</h3>
                                <p className="text-xs text-white/45">Conversacion en tiempo real</p>
                            </div>
                            <button
                                onClick={() => setShowCommentsModal(false)}
                                className="rounded-full bg-white/5 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 custom-scrollbar">
                            {!commentsTree.length ? (
                                <div className="flex flex-col justify-center items-center py-20 text-center gap-2">
                                    <div className="h-14 w-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                                        <Smile size={24} className="text-white/20" />
                                    </div>
                                    <h3 className="text-white/70 font-medium">Sé el primero en comentar</h3>
                                    <p className="text-white/35 text-sm max-w-[220px]">Aún no hay comentarios en este video.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {commentsTree.map(c => renderComment(c))}
                                </div>
                            )}
                        </div>

                        {/* INPUT AREA */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 pb-3 bg-[#050718]">
                            <AnimatePresence>
                                {replyingTo && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="flex items-center justify-between mb-3 text-xs bg-black border border-white/10 rounded-2xl px-4 py-2"
                                    >
                                        <div className="flex items-center gap-2 text-white/60">
                                            <span>Respondiendo a</span>
                                            <span className="text-[#00f0ff] font-bold">@{replyingTo.username}</span>
                                        </div>
                                        <button onClick={cancelReply} className="text-white/40 hover:text-white p-1">
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-end gap-3 max-w-2xl mx-auto">
                                <div className="relative flex-1 group">
                                    <div className="relative flex items-center bg-[#1a1f3a] border border-white/10 group-focus-within:border-[#00f0ff]/50 rounded-full overflow-hidden transition-all duration-300">
                                        <div className="pl-3 py-2 flex-shrink-0">
                                            <img
                                                src={`${getBaseUrl()}${user.profile_picture}`}
                                                alt="Yo"
                                                className="h-9 w-9 rounded-full object-cover border border-white/10"
                                            />
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Añade un comentario increíble..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault()
                                                    sendComment()
                                                }
                                            }}
                                            className="flex-1 bg-transparent px-3 py-3 text-white text-[15px] placeholder:text-white/30 focus:outline-none"
                                        />

                                        <div className="flex items-center gap-1 pr-2 py-2">
                                            <button
                                                ref={emojiButtonRef}
                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                className={`p-2 rounded-full transition-colors ${showEmojiPicker ? "bg-[#00f0ff]/10 text-[#00f0ff]" : "hover:bg-white/5 text-white/40"}`}
                                            >
                                                <Smile size={22} />
                                            </button>

                                            {commentText.trim() && (
                                                <motion.button
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    onClick={sendComment}
                                                    className="h-9 w-9 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#7000ff] to-[#00f0ff] text-white shadow-lg shadow-[#00f0ff]/20"
                                                >
                                                    <ChevronRight size={20} className="ml-0.5" />
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
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
                                className="fixed bottom-32 left-6 right-6 mx-auto max-w-md bg-[#1a1a24]/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden z-[80]"
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
                                                whileHover={{ scale: 1.3, rotate: 5 }}
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
