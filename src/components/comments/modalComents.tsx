import { AnimatePresence, motion } from "framer-motion"
import { CommentData } from "../index"
import { useState, useRef, useEffect } from "react"
import { Smile, X } from "lucide-react"
import { allEmojis } from "./emojis"

// Tipo extendido con replies
type CommentWithReply = CommentData & {
    parent_uuid?: string | null
    replies?: CommentWithReply[]
}

type Props = {
    showCommentsModal: boolean
    setShowCommentsModal: (value: boolean) => void
    comments: CommentWithReply[] | null
    user: { profile_picture: string }
    commentText: string
    setCommentText: (value: string) => void
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

    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const emojiButtonRef = useRef<HTMLButtonElement>(null)

    // ---------------------------------
    // ✅ Convertir lista PLANA a ÁRBOL
    // ---------------------------------
    const buildCommentTree = (list: CommentWithReply[]) => {
        const map: Record<string, CommentWithReply> = {}
        const roots: CommentWithReply[] = []
        
        list.forEach(c => {
            map[c.uuid] = { ...c, replies: [] }
        })
        console.log( list, "*********************")
        
        list.forEach(c => {
            if (c.parent_uuid) {
                if (map[c.parent_uuid]) {
                    map[c.parent_uuid].replies!.push(map[c.uuid])
                }
            } else {
                roots.push(map[c.uuid])
            }
        })
        
        return roots
    }

    const commentTree = comments ? buildCommentTree(comments) : []

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
        setCommentText(prev => prev + emoji)
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

        return (
            <motion.div
                key={comment.uuid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`py-3 ${depth > 0 ? "ml-12 border-l border-white/10 pl-4" : "border-b border-white/5"}`}
            >
                <div className="flex items-start gap-3">
                    <img
                        src={`http://localhost:8000/media/${comment.user_id.profile_picture || 'profile_pics/avatar.webp'}`}
                        alt={comment.user_id.username}
                        className="h-10 w-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight break-words">
                            <span className="font-semibold text-white mr-2">{comment.user_id.username}</span>
                            <span className="text-[#e0e7ff]">{comment.content}</span>
                        </p>

                        <div className="flex items-center gap-4 mt-1 text-xs text-[#8b9cff]/70">
                            <span>{comment.create_at}</span>

                            <button
                                onClick={() => handleReply(comment.uuid, comment.user_id.username)}
                                className="font-medium hover:text-white transition-colors"
                            >
                                Responder
                            </button>
                        </div>

                        {/* BOTÓN VER RESPUESTAS */}
                        {hasReplies && (
                            <button
                                className="mt-2 text-xs text-[#8b9cff] hover:text-white"
                                onClick={() => toggleReplies(comment.uuid)}
                            >
                                {isOpen
                                    ? "Ocultar respuestas"
                                    : `Ver ${comment.replies!.length} respuestas`}
                            </button>
                        )}
                    </div>

                    <motion.button whileTap={{ scale: 1.4 }} className="text-[#ff6b6b] text-lg">
                        ❤️
                    </motion.button>
                </div>

                {/* RESPUESTAS ANIDADAS */}
                {hasReplies && isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                    >
                        {comment.replies!.map(reply => renderComment(reply, depth + 1))}
                    </motion.div>
                )}
            </motion.div>
        )
    }

    // ---------------------------------
    // UI PRINCIPAL
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
                        className="fixed bottom-15 left-0 right-0 max-h-[55vh] z-50 flex flex-col bg-[#0f0f1a] rounded-t-3xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="w-12 h-1.5 bg-white/30 rounded-full cursor-pointer" />
                        </div>

                        <h1 className="text-center font-bold text-white text-lg pb-2">Comentarios</h1>

                        {/* LISTA */}
                        <div className="flex-1 overflow-y-auto px-4 pb-24 custom-scrollbar">
                            {!commentTree.length ? (
                                <div className="flex justify-center items-center h-32">
                                    <p className="text-[#a2b0ff] text-sm">Aún no hay comentarios</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {commentTree.map(c => renderComment(c))}
                                </div>
                            )}
                        </div>

                        {/* INPUT */}
                        <div className="border-t border-white/10 bg-[#0f0f1a] px-4 pt-3 pb-6">
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
                                    src={`http://127.0.0.1:8000${user.profile_picture}`}
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
                                        {allEmojis.slice(0, 96).map((emoji, i) => (
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
