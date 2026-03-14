import { AnimatePresence, motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { Smile, X } from "lucide-react"
import { allEmojis } from "./emojis"
import { CommentData } from "../index"
import { getBaseUrl } from "../../redux/client/api-client"

// EXTENDER COMENTARIO
type CommentWithReply = CommentData & {
    replies?: CommentWithReply[]
    parent?: { uuid: string }
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

    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [replyingTo, setReplyingTo] = useState<{ uuid: string; username: string } | null>(null)
    const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({})
    const [commentsTree, setCommentsTree] = useState<CommentWithReply[]>([])

    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const emojiButtonRef = useRef<HTMLButtonElement>(null)

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
            const aPlan = a.user_id.subscription_status?.plan?.name?.toUpperCase() || 'NONE';
            const bPlan = b.user_id.subscription_status?.plan?.name?.toUpperCase() || 'NONE';

            const aPriority = planOrder[aPlan] ?? 4;
            const bPriority = planOrder[bPlan] ?? 4;

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            // Si tienen la misma prioridad, por fecha (más nuevos primero)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

    // ---------------------------------
    // COMPONENTE RECURSIVO
    // ---------------------------------
    const renderComment = (comment: CommentWithReply, depth = 0) => {
        const hasReplies = comment.replies && comment.replies.length > 0
        const isOpen = openReplies[comment.uuid]
        const sub = comment.user_id.subscription_status
        const planName = sub?.plan?.name?.toUpperCase() || 'NONE'

       let itemClasses = `py-4 px-3 rounded-2xl transition-all duration-300 ${depth > 0 ? "ml-10 border-l border-white/10 pl-4 mt-1" : "mb-2 border border-transparent"}`
        let avatarBorder = "border-2 border-black"
        let nameColor = "text-white"
        let bgEffect = ""

        if (planName === 'FRIEND') {
            itemClasses += " bg-gradient-to-r from-cyan-500/10 via-blue-600/5 to-transparent border-cyan-400/20 shadow-[0_4px_15px_rgba(0,240,255,0.1)]"
            avatarBorder = "border-2 border-[#00f0ff]"
            nameColor = "text-cyan-400"
            bgEffect = "DIAMOND"
        } else if (planName === 'PLUS') {
            itemClasses += " bg-gradient-to-r from-purple-500/10 via-pink-600/5 to-transparent border-purple-400/20"
            avatarBorder = "border-2 border-purple-500"
            nameColor = "text-purple-400"
            bgEffect = "PLUS"
        } else if (planName === 'VIP') {
            itemClasses += " bg-gradient-to-r from-amber-400/10 via-orange-500/5 to-transparent border-amber-400/20"
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
                className={`py-3 ${depth > 0 ? "ml-12 border-l border-white/10 pl-4" : "border-b border-white/5"}`}
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
                            <div className="absolute -bottom-1 -right-1 z-10 scale-75">
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
                            <span className={`font-bold text-sm ${nameColor}`}>{comment.user_id.username}</span>
                            <span className="text-[10px] text-gray-500 font-medium">
                                {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-200 break-words">
                            {comment.content}
                        </p>

                        <div className="flex items-center gap-5 mt-2 text-xs">
                            <button
                                onClick={() => handleReply(comment.uuid, comment.user_id.username)}
                                className="font-medium hover:text-white transition-colors"
                            >
                                Responder
                            </button>
                        </div>

                        {hasReplies && (
                            <button
                                className="mt-2 text-xs text-[#8b9cff] hover:text-white"
                                onClick={() => toggleReplies(comment.uuid)}
                            >
                                {isOpen ? "---- Hide replies" : `---- View ${comment.replies!.length} replies`}
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
                        className="fixed inset-0 bg-black/70 z-40"
                        onClick={() => setShowCommentsModal(false)}
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed bottom-13 left-0 right-0 max-h-[55vh] z-50 flex flex-col bg-black rounded-t-3xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-center p-3 "><div className="w-12 h-1.5 bg-[#00f0ff] rounded-full cursor-pointer"></div></div>

                        <h2 className="text-center font-bold text-white pb-2">Comentarios ---</h2>

                        <div className="flex-1 overflow-y-auto px-4 pb-24 custom-scrollbar">
                            {!commentsTree.length ? (
                                <div className="flex justify-center items-center h-32">
                                    <p className="text-[#a2b0ff] text-sm">Aún no hay comentarios</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {commentsTree.map(c => renderComment(c))}
                                </div>
                            )}
                        </div>

                        {/* INPUT */}
                        <div className="border-t border-white/20 bg-black px-1 pt-2 pb-4">
                            <AnimatePresence>
                                {replyingTo && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center justify-between mb-2 text-xs text-[#8b9cff] bg-[#1e1e2e]/50 rounded-full px-3 py-1.5"
                                    >
                                        <span>Respondiendo a @{replyingTo.username}</span>
                                        <button onClick={cancelReply} className="hover:text-white">
                                            <X size={16} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-center gap-3">
                                <img
                                    src={`${getBaseUrl()}${user.profile_picture}`}
                                    alt="Yo"
                                    className="h-9 w-9 rounded-full object-cover border border-white/20"
                                />

                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Añade un comentario..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                sendComment()
                                            }
                                        }}
                                        className="w-full pl-12 pr-16 py-3.5 rounded-full bg-[#1e1e2e] border border-white/10 text-white placeholder:text-[#8b9cff]/60"
                                    />

                                    <motion.button
                                        ref={emojiButtonRef}
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Smile size={22} className={showEmojiPicker ? "text-[#00f0ff]" : "text-[#8b9cff]"} />
                                    </motion.button>

                                    {commentText.trim() && (
                                        <motion.button
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={sendComment}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00f0ff] font-bold"
                                        >
                                            Publicar
                                        </motion.button>
                                    )}
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
                                className="fixed bottom-32 left-4 right-4 mx-auto max-w-lg bg-[#1e1e2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60]"
                            >
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1a1a2e]">
                                    <h3 className="text-white font-semibold text-sm">Emojis</h3>
                                    <button
                                        onClick={() => setShowEmojiPicker(false)}
                                        className="p-1.5 rounded-full hover:bg-white/10"
                                    >
                                        <X size={18} className="text-[#8b9cff]" />
                                    </button>
                                </div>

                                <div className="p-4 overflow-y-auto" style={{ maxHeight: "320px" }}>
                                    <div className="grid grid-cols-8 gap-3">
                                        {allEmojis.map((emoji, i) => (
                                            <motion.span
                                                key={i}
                                                whileTap={{ scale: 1.6 }}
                                                className="text-3xl cursor-pointer hover:bg-white/10 rounded-xl p-1 flex items-center justify-center"
                                                onClick={() => handleEmojiSelect(emoji)}
                                            >
                                                {emoji}
                                            </motion.span>
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
