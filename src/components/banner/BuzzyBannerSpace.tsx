import { useEffect, useState, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { motion, AnimatePresence } from "framer-motion"
import { X, Bell } from "lucide-react"
import type { RootState } from "../../store"
import { fetchActiveBanner, dismissBanner } from "../../redux/actions/getBanner"
import type { BannerData } from "../../redux/reducers/bannerReducer"
import ParticlesBanner from "./effects/ParticlesBanner"
import HolographicBanner from "./effects/HolographicBanner"
import ScratchBanner from "./effects/ScratchBanner"
import NarrativeBanner from "./effects/NarrativeBanner"
import CountdownBanner from "./effects/CountdownBanner"

// Tipos que NO se pueden cerrar inmediatamente
const NO_CLOSE_TYPES: BannerData['type'][] = ['ALERT']
// Tipos que muestran el botón cerrar con delay
const DELAY_CLOSE_TYPES: BannerData['type'][] = ['ACHIEVEMENT']
// PRIZE: solo se puede cerrar después de rascar
const SCRATCH_CLOSE_TYPE: BannerData['type'] = 'PRIZE'

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
  const { banner, dismissed } = useSelector((state: RootState) => (state as any).bannerReducer)

  const [collapsed, setCollapsed] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [scratchDone, setScratchDone] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    dispatch(fetchActiveBanner() as any)
  }, [dispatch])

  // Lógica de cuándo mostrar el botón cerrar
  useEffect(() => {
    if (!banner || dismissed) return
    if (NO_CLOSE_TYPES.includes(banner.type)) {
      setShowClose(false)
      return
    }
    if (banner.type === SCRATCH_CLOSE_TYPE) {
      setShowClose(scratchDone)
      return
    }
    if (DELAY_CLOSE_TYPES.includes(banner.type)) {
      const t = setTimeout(() => setShowClose(true), 3000)
      return () => clearTimeout(t)
    }
    setShowClose(true)
  }, [banner, dismissed, scratchDone])

  const handleDismiss = useCallback(() => {
    if (!banner) return
    dispatch(dismissBanner(banner.id) as any)
  }, [banner, dispatch])

  const handleExpired = useCallback(() => {
    setExpired(true)
    if (banner) dispatch(dismissBanner(banner.id) as any)
  }, [banner, dispatch])

  if (!banner || dismissed || expired) return null

  const bg = banner.background_color
  const tc = banner.text_color

  // Si está colapsado, mostramos solo la píldora
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
          <span>1 mensaje de Buzzy</span>
        </button>
      </motion.div>
    )
  }

  const isNarrative = banner.effect === 'NARRATIVE'
  const isParticles = banner.effect === 'PARTICLES'
  const isHolo     = banner.effect === 'HOLOGRAPHIC'
  const isScratch  = banner.effect === 'SCRATCH'
  const isCountdown = banner.effect === 'COUNTDOWN'

  return (
    <AnimatePresence>
      <motion.div
        key={banner.id}
        initial={{ opacity: 0, y: -16, scaleY: 0.9 }}
        animate={{ opacity: 1, y: 0, scaleY: 1 }}
        exit={{ opacity: 0, y: -16, scaleY: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full h-full overflow-hidden"
        style={{
          background: bg,
          minHeight: '100%',
        }}
      >
        {/* Efecto de fondo */}
        {isParticles  && <ParticlesBanner banner={banner} />}
        {isHolo       && <HolographicBanner />}

        {/* Contenido principal (oculto cuando es SCRATCH o NARRATIVE — ellos lo manejan) */}
        {!isNarrative && !isScratch && (
          <div className="relative z-10 flex flex-col items-center justify-center px-8 pt-14 pb-4 text-center gap-0.5 w-full h-full">
            <div className="flex items-center gap-2">
              <span className="text-base">{getTypeIcon(banner.type)}</span>
              <p className="font-bold text-sm leading-snug" style={{ color: tc }}>
                {banner.title}
              </p>
            </div>
            <p className="text-xs opacity-80" style={{ color: tc }}>
              {banner.message}
            </p>
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

        {/* Botón cerrar */}
        {showClose && (
          <div className="absolute top-2 right-2 z-20 flex gap-1">
            {/* Colapsar a píldora */}
            <button
              onClick={() => setCollapsed(true)}
              className="w-5 h-5 flex items-center justify-center rounded-full opacity-50 hover:opacity-90 transition-opacity text-xs"
              style={{ background: 'rgba(0,0,0,0.25)', color: tc }}
              title="Minimizar"
            >
              −
            </button>
            {/* Descartar */}
            <button
              onClick={handleDismiss}
              className="w-5 h-5 flex items-center justify-center rounded-full opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.25)', color: tc }}
              title="Cerrar"
            >
              <X size={10} />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
