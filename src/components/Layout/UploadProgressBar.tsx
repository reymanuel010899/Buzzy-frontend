import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import { completeUpload, resetUpload } from '../../redux/reducers/uploadProgressReducer'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { getBaseUrl } from '../../redux/client/api-client'

const POLL_INTERVAL_MS = 5000

const UploadProgressBar: React.FC = () => {
    const dispatch = useDispatch()
    const { isUploading, videoId, status, safetyLabel } = useSelector((state: RootState) => state.uploadProgress)
    const [progress, setProgress] = useState(0)
    const [showToast, setShowToast] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const isDone = status === 'done'
    const isBlocked = status === 'blocked'
    const isError = status === 'error'
    const isFinished = isDone || isBlocked || isError
    const isVisible = isUploading || isFinished

    // ── Fake progress bar fill while uploading ──────────────────────
    useEffect(() => {
        if (isUploading) {
            setProgress(prev => (prev < 5 ? 5 : prev)) // resume where we left off after reload
            intervalRef.current = setInterval(() => {
                setProgress(prev => (prev >= 85 ? 85 : prev + 0.4))
            }, 400)
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [isUploading])

    // ── Polling fallback ────────────────────────────────────────────
    // Runs when isUploading + videoId are set (including after a page reload).
    // Primary notification is WebSocket; polling is the safety net.
    useEffect(() => {
        if (!isUploading || !videoId) {
            if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
            }
            return
        }

        const checkStatus = async () => {
            try {
                const token = localStorage.getItem('accessToken') || ''
                const res = await fetch(`${getBaseUrl()}api/videos/create/?id=${videoId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) return
                const data = await res.json()
                if (data?.status === 'ready') {
                    clearInterval(pollRef.current!)
                    pollRef.current = null
                    dispatch(completeUpload('done'))
                } else if (data?.status === 'blocked') {
                    clearInterval(pollRef.current!)
                    pollRef.current = null
                    dispatch(completeUpload('blocked', data.safety_label || 'Contenido bloqueado por moderación'))
                }
                // 'pending' or 'processing' → keep polling
            } catch {
                // network error, try again next tick
            }
        }

        pollRef.current = setInterval(checkStatus, POLL_INTERVAL_MS)
        // Also check immediately on mount (covers reload scenario)
        checkStatus()

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
            }
        }
    }, [isUploading, videoId])

    // ── On finish: jump to 100%, show toast, auto-reset ─────────────
    useEffect(() => {
        if (!isFinished) return

        setProgress(100)
        setShowToast(true)

        const hideTimer = setTimeout(() => {
            setShowToast(false)
            setTimeout(() => {
                dispatch(resetUpload())
                setProgress(0)
            }, 400)
        }, 3500)

        return () => clearTimeout(hideTimer)
    }, [isFinished])

    if (!isVisible) return null

    const barColor = isFinished && !isDone
        ? 'linear-gradient(to right, #ef4444, #f87171)'
        : isDone
        ? 'linear-gradient(to right, #10b981, #34d399)'
        : 'linear-gradient(to right, #06b6d4, #8b5cf6)'

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
            {/* Thin progress bar */}
            <div className="h-[3px] w-full bg-white/10">
                <motion.div
                    className="h-full"
                    style={{ background: barColor }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: isFinished ? 0.4 : 0.6 }}
                />
            </div>

            {/* Toast notification */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="pointer-events-auto flex justify-center mt-3"
                    >
                        <div
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-xl max-w-xs ${
                                isDone ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                            }`}
                        >
                            {isDone ? (
                                <>
                                    <CheckCircle2 size={16} className="shrink-0" />
                                    ¡Video publicado exitosamente!
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>
                                        {isBlocked
                                            ? safetyLabel || 'Video bloqueado por moderación'
                                            : 'Error al publicar el video'}
                                    </span>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default UploadProgressBar
