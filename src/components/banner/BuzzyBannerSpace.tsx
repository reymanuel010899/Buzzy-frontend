import { useEffect, useState, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { motion, AnimatePresence } from "framer-motion"
import { X, Bell, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { RootState } from "../../store"
import { dismissBanner, trackBannerClick } from "../../redux/actions/getBanner"
import type { BannerData } from "../../redux/reducers/bannerReducer"
import ParticlesBanner from "./effects/ParticlesBanner"
import HolographicBanner from "./effects/HolographicBanner"
import ScratchBanner from "./effects/ScratchBanner"
import NarrativeBanner from "./effects/NarrativeBanner"
import CountdownBanner from "./effects/CountdownBanner"

const NO_CLOSE_TYPES: BannerData['type'][] = ['ALERT']
const DELAY_CLOSE_TYPES: BannerData['type'][] = ['ACHIEVEMENT']

function getTypeIcon(type: BannerData['type']) {
  switch (type) {
    case 'ANNOUNCEMENT': return '📢'
    case 'ALERT':        return '⚠️'
    case 'ACHIEVEMENT':  return '🏆'
    case 'PRIZE':        return '🎁'
    case 'OFFER':        return '⚡'
    default:             return '📢'
  }
}

export default function BuzzyBannerSpace() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { queue, currentIndex } = useSelector((state: RootState) => (state as any).bannerReducer)
  const banner: BannerData | null = queue[currentIndex] ?? null
  const remaining = queue.length - currentIndex - 1

  const [collapsed, setCollapsed] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [scratchDone, setScratchDone] = useState(false)
  const [expired, setExpired] = useState(false)

  // Reset de estados al cambiar de banner
  useEffect(() => {
    setCollapsed(false)
    setShowClose(false)
    setScratchDone(false)
    setExpired(false)
  }, [currentIndex])

  // Cuándo mostrar el botón cerrar
  useEffect(() => {
    if (!banner) return
    if (NO_CLOSE_TYPES.includes(banner.type)) {
      setShowClose(false)
      return
    }
    if (banner.effect === 'SCRATCH') {
      setShowClose(scratchDone)
      return
    }
    if (DELAY_CLOSE_TYPES.includes(banner.type)) {
      const t = setTimeout(() => setShowClose(true), 3000)
      return () => clearTimeout(t)
    }
    setShowClose(true)
  }, [banner, scratchDone])

  const handleDismiss = useCallback(() => {
    if (!banner) return
    dispatch(dismissBanner(banner.id) as any)
  }, [banner, dispatch])

  const handleExpired = useCallback(() => {
    setExpired(true)
    if (banner) dispatch(dismissBanner(banner.id) as any)
  }, [banner, dispatch])

  const handleCTA = useCallback(() => {
    if (!banner?.action_url) return
    dispatch(trackBannerClick(banner.id) as any)
    navigate(banner.action_url)
  }, [banner, dispatch, navigate])

  if (!banner || expired) return null

  const bg = banner.background_color
  const tc = banner.text_color

  if (collapsed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center w-full px-4 mb-2"
      >
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg"
          style={{ background: bg, color: tc }}
        >
          <Bell size={12} />
          <span>{remaining > 0 ? `${remaining + 1} mensajes de Buzzy` : '1 mensaje de Buzzy'}</span>
        </button>
      </motion.div>
    )
  }

  const isNarrative = banner.effect === 'NARRATIVE'
  const isParticles = banner.effect === 'PARTICLES'
  const isHolo      = banner.effect === 'HOLOGRAPHIC'
  const isScratch   = banner.effect === 'SCRATCH'
  const isCountdown = banner.effect === 'COUNTDOWN'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={banner.id}
        initial={{ opacity: 0, y: -16, scaleY: 0.9 }}
        animate={{ opacity: 1, y: 0, scaleY: 1 }}
        exit={{ opacity: 0, y: -16, scaleY: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full h-full overflow-hidden"
        style={{ background: bg, minHeight: '100%' }}
      >
        {/* Efectos de fondo */}
        {isParticles && <ParticlesBanner banner={banner} />}
        {isHolo      && <HolographicBanner />}

        {/* Imagen decorativa */}
        {banner.image_url && !isNarrative && !isScratch && (
          <div className="absolute inset-0 z-0 opacity-20">
            <img src={banner.image_url} className="w-full h-full object-cover" alt="" />
          </div>
        )}

        {/* Contador de banners en cola */}
        {remaining > 0 && (
          <div
            className="absolute top-2 left-3 z-20 text-[9px] font-bold opacity-60 px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.25)', color: tc }}
          >
            1 / {remaining + 1}
          </div>
        )}

        {/* Contenido principal */}
        {!isNarrative && !isScratch && (
          <div className="relative z-10 flex flex-col items-center justify-center px-8 pt-12 pb-4 text-center gap-1 w-full h-full">
            <div className="flex items-center gap-2">
              <span className="text-base">{getTypeIcon(banner.type)}</span>
              <p className="font-bold text-sm leading-snug" style={{ color: tc }}>
                {banner.title}
              </p>
            </div>
            <p className="text-xs opacity-80" style={{ color: tc }}>
              {banner.message}
            </p>

            {/* Botón CTA */}
            {banner.action_url && banner.action_label && (
              <button
                onClick={handleCTA}
                className="mt-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-opacity hover:opacity-80 active:scale-95"
                style={{ background: banner.accent_color, color: tc }}
              >
                <ExternalLink size={11} />
                {banner.action_label}
              </button>
            )}
          </div>
        )}

        {/* Efectos sobre el contenido */}
        {isNarrative && (
          <NarrativeBanner
            title={banner.title}
            message={banner.message}
            textColor={tc}
          />
        )}

        {isScratch && (
          <ScratchBanner
            revealContent={banner.reveal_content || banner.message}
            accentColor={banner.accent_color}
            onFullyScratched={() => setScratchDone(true)}
          />
        )}

        {isCountdown && banner.expires_at && (
          <CountdownBanner
            expiresAt={banner.expires_at}
            label={banner.countdown_label}
            textColor={tc}
            onExpired={handleExpired}
          />
        )}

        {/* Botones cerrar / minimizar */}
        {showClose && (
          <div className="absolute top-2 right-2 z-20 flex gap-1">
            <button
              onClick={() => setCollapsed(true)}
              className="w-5 h-5 flex items-center justify-center rounded-full opacity-50 hover:opacity-90 transition-opacity text-xs"
              style={{ background: 'rgba(0,0,0,0.25)', color: tc }}
              title="Minimizar"
            >
              −
            </button>
            <button
              onClick={handleDismiss}
              className="w-5 h-5 flex items-center justify-center rounded-full opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.25)', color: tc }}
              title={remaining > 0 ? `Cerrar (${remaining} más)` : 'Cerrar'}
            >
              <X size={10} />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
