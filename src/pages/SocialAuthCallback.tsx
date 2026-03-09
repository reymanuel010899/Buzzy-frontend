import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { apiClient } from '../redux/client/api-client'
import { useDispatch } from 'react-redux'
import { getSocialAccounts } from '../redux/actions/socialAccountsActions'

type Status = 'loading' | 'success' | 'error'

const PLATFORM_LABELS: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    facebook: 'Facebook',
}

const PLATFORM_COLORS: Record<string, string> = {
    instagram: 'from-[#f56040] via-[#c13584] to-[#833ab4]',
    tiktok: 'from-gray-800 to-black',
    facebook: 'from-[#1877f2] to-[#0c52c0]',
}

export default function SocialAuthCallback() {
    const { platform = '' } = useParams<{ platform: string }>()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const [status, setStatus] = useState<Status>('loading')
    const [message, setMessage] = useState('')
    const [platformUsername, setPlatformUsername] = useState('')

    useEffect(() => {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
            setStatus('error')
            setMessage(`Acceso denegado por ${PLATFORM_LABELS[platform] ?? platform}: ${error}`)
            return
        }

        if (!code) {
            setStatus('error')
            setMessage('No se recibió el código de autorización.')
            return
        }

        // Exchange the authorization code for a token via our backend
        apiClient
            .get(`/api/social/callback/${platform}/`, { params: { code, state } })
            .then((res: any) => {
                setStatus('success')
                setMessage(res.data.message ?? `¡${PLATFORM_LABELS[platform] ?? platform} conectado!`)
                setPlatformUsername(res.data.platform_username ?? '')
                // Refresh social accounts in the store
                dispatch(getSocialAccounts() as any)

                // Redirect back to the user's profile after 2.5 s
                setTimeout(() => {
                    const user = localStorage.getItem('user')
                    const username = user ? JSON.parse(user).username : null
                    navigate(username ? `/profile/${username}` : '/')
                }, 2500)
            })
            .catch((err: any) => {
                setStatus('error')
                setMessage(
                    err.response?.data?.error ??
                    `Error al conectar ${PLATFORM_LABELS[platform] ?? platform}. Intenta de nuevo.`
                )
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const gradientClass = PLATFORM_COLORS[platform] ?? 'from-purple-600 to-indigo-600'
    const platformLabel = PLATFORM_LABELS[platform] ?? platform

    // Helper to render message with line breaks or as a list
    const renderMessage = (msg: string) => {
        if (!msg.includes('\n')) return <p className="text-white/50 text-sm mb-6">{msg}</p>

        const lines = msg.split('\n').filter(line => line.trim() !== '')
        return (
            <div className="text-left mb-6 space-y-3">
                {lines.map((line, i) => {
                    // Check if it's a "Pasos para arreglarlo" or "Asegúrate de" header
                    if (line.includes(':')) {
                        return <p key={i} className="text-white/70 text-xs font-bold uppercase tracking-wider">{line}</p>
                    }
                    // Check if it's a numbered step
                    const isStep = /^\d\./.test(line)
                    return (
                        <div key={i} className={`flex gap-3 items-start ${isStep ? 'bg-white/5 p-3 rounded-xl border border-white/5' : ''}`}>
                            {isStep && (
                                <span className="w-5 h-5 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold text-white/50">
                                    {line[0]}
                                </span>
                            )}
                            <p className="text-white/50 text-xs leading-relaxed">
                                {isStep ? line.substring(2).trim() : line}
                            </p>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#050718] flex items-center justify-center p-6">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/20 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.35 }}
                className="relative bg-[#0a0a0f] border border-white/10 rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl"
            >
                {/* Platform icon gradient pill */}
                <div className={`mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-6 shadow-lg`}>
                    <span className="text-white text-3xl font-black">
                        {platformLabel.charAt(0)}
                    </span>
                </div>

                {status === 'loading' && (
                    <>
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Conectando {platformLabel}…</h2>
                        <p className="text-white/50 text-sm">Espera un momento mientras procesamos tu autorización.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">¡Conectado!</h2>
                        {platformUsername && (
                            <p className="text-emerald-400 font-semibold mb-1">@{platformUsername}</p>
                        )}
                        <p className="text-white/50 text-sm mb-6">{message}</p>
                        <p className="text-white/30 text-xs animate-pulse">Redirigiendo a tu perfil…</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Algo salió mal</h2>
                        {renderMessage(message)}
                        <button
                            onClick={() => {
                                const user = localStorage.getItem('user')
                                const username = user ? JSON.parse(user).username : null
                                navigate(username ? `/profile/${username}` : '/')
                            }}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-purple-600/20"
                        >
                            Volver al perfil
                        </button>
                    </>
                )}
            </motion.div>
        </div>
    )
}
