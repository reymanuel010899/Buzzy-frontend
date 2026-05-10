import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Loader2, Lock, Shield, ShieldCheck, X } from "lucide-react"
import { getChatPrivacyStatus, verifyChatPin } from "../../redux/actions/chatPrivacy"

interface WithdrawPinModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onConfigurePin: () => void
}

const PIN_LENGTH = 6

const WithdrawPinModal: React.FC<WithdrawPinModalProps> = ({ isOpen, onClose, onSuccess, onConfigurePin }) => {
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [pin, setPin] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checkingPin, setCheckingPin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [verified, setVerified] = useState(false)
  const hiddenInputRef = useRef<HTMLInputElement | null>(null)

  const filled = pin.length === PIN_LENGTH

  useEffect(() => {
    if (!isOpen) {
      setPin("")
      setActiveIndex(0)
      setError(null)
      setLoading(false)
      setShake(false)
      setVerified(false)
      setHasPin(null)
      return
    }
    setCheckingPin(true)
    getChatPrivacyStatus()
      .then((data) => setHasPin(data.has_pin))
      .catch(() => setHasPin(false))
      .finally(() => setCheckingPin(false))
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (loading || verified) return
    if (/^\d$/.test(e.key)) {
      e.preventDefault()
      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev
        const next = `${prev}${e.key}`.slice(0, PIN_LENGTH)
        setActiveIndex(Math.min(next.length, PIN_LENGTH - 1))
        return next
      })
      return
    }
    if (e.key === "Backspace") {
      e.preventDefault()
      setError(null)
      setPin((prev) => {
        const next = prev.slice(0, -1)
        setActiveIndex(Math.max(next.length, 0))
        return next
      })
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSlotClick = (index: number) => {
    setActiveIndex(index)
    hiddenInputRef.current?.focus()
  }

  const handleSubmit = async () => {
    if (!filled || loading || verified) return
    setLoading(true)
    setError(null)
    try {
      await verifyChatPin(pin)
      setVerified(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 700)
    } catch (err: any) {
      setError(err?.response?.data?.error || "PIN incorrecto, intenta de nuevo")
      setShake(true)
      setPin("")
      setActiveIndex(0)
      window.setTimeout(() => setShake(false), 450)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (filled && !loading && !verified && hasPin) {
      handleSubmit()
    }
  }, [pin]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center p-4"
          style={{ background: "rgba(0,10,8,0.88)", backdropFilter: "blur(12px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="relative w-full max-w-[360px] overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #071a14 0%, #050f0a 60%, #020a06 100%)",
              borderRadius: 32,
              border: "1px solid rgba(16,185,129,0.18)",
              boxShadow: "0 0 60px rgba(16,185,129,0.12), 0 32px 80px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(6,214,160,0.08) 0%, transparent 70%)" }} />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4"
              style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,214,160,0.1))",
                    border: "1px solid rgba(16,185,129,0.3)",
                    boxShadow: "0 0 20px rgba(16,185,129,0.2)",
                  }}>
                  <Shield size={20} style={{ color: "#10b981" }} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.35em]" style={{ color: "rgba(16,185,129,0.6)" }}>
                    WALLET
                  </p>
                  <h2 className="text-lg font-black text-white leading-tight">Confirmar retiro</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 transition"
                style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="relative z-10 px-6 py-6">

              {/* Checking */}
              {checkingPin && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={28} className="animate-spin" style={{ color: "rgba(16,185,129,0.6)" }} />
                  <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Verificando...
                  </p>
                </div>
              )}

              {/* No PIN */}
              {!checkingPin && hasPin === false && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center py-6"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: "rgba(16,185,129,0.25)" }} />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full"
                      style={{
                        background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,214,160,0.08))",
                        border: "1px solid rgba(16,185,129,0.25)",
                      }}>
                      <Lock size={30} style={{ color: "#10b981" }} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No tienes PIN configurado</h3>
                  <p className="text-sm leading-6 max-w-[260px] mb-7" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Para retirar fondos necesitas crear tu PIN de seguridad de 6 dígitos en Privacidad de chats.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onConfigurePin}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white transition"
                    style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      boxShadow: "0 0 28px rgba(16,185,129,0.35)",
                    }}
                  >
                    Configurar PIN ahora
                    <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
                      <ArrowRight size={16} />
                    </motion.div>
                  </motion.button>
                </motion.div>
              )}

              {/* PIN entry */}
              {!checkingPin && hasPin === true && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <motion.div animate={shake ? { x: [0, -10, 10, -7, 7, 0] } : { x: 0 }} transition={{ duration: 0.38 }}>

                    {/* Info box */}
                    <div className="mb-6 rounded-2xl px-4 py-3"
                      style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <p className="text-sm font-semibold text-white">Ingresa tu PIN de seguridad</p>
                      <p className="text-xs mt-0.5 leading-5" style={{ color: "rgba(255,255,255,0.38)" }}>
                        Por tu seguridad, necesitamos verificar tu identidad antes de procesar el retiro.
                      </p>
                    </div>

                    {/* Hidden input */}
                    <input
                      ref={hiddenInputRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-hidden="true"
                      tabIndex={-1}
                      value=""
                      onChange={() => undefined}
                      onKeyDown={handleKeyDown}
                      className="sr-only"
                    />

                    {/* PIN slots */}
                    <div className="grid grid-cols-6 gap-2.5 mb-3">
                      {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                        const isActive = i === activeIndex && pin.length < PIN_LENGTH
                        const isFilled = !!pin[i]
                        return (
                          <motion.div
                            key={i}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSlotClick(i)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSlotClick(i) }}
                            animate={verified ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                            className="flex h-13 items-center justify-center rounded-2xl cursor-pointer transition-all duration-200"
                            style={{
                              height: 52,
                              background: verified
                                ? "rgba(16,185,129,0.18)"
                                : isActive
                                  ? "rgba(16,185,129,0.12)"
                                  : isFilled
                                    ? "rgba(16,185,129,0.08)"
                                    : "rgba(255,255,255,0.04)",
                              border: verified
                                ? "1px solid rgba(16,185,129,0.55)"
                                : isActive
                                  ? "1px solid rgba(16,185,129,0.6)"
                                  : isFilled
                                    ? "1px solid rgba(16,185,129,0.35)"
                                    : "1px solid rgba(255,255,255,0.07)",
                              boxShadow: isActive ? "0 0 16px rgba(16,185,129,0.2)" : "none",
                            }}
                          >
                            <div className="h-2.5 w-2.5 rounded-full transition-all duration-150"
                              style={{
                                background: verified
                                  ? "#10b981"
                                  : isFilled
                                    ? "#10b981"
                                    : "rgba(255,255,255,0.15)",
                                transform: isFilled || verified ? "scale(1)" : "scale(0.75)",
                                boxShadow: (isFilled || verified) ? "0 0 8px rgba(16,185,129,0.6)" : "none",
                              }}
                            />
                          </motion.div>
                        )
                      })}
                    </div>

                    <p className="text-center text-[9px] uppercase tracking-[0.28em] mb-5"
                      style={{ color: "rgba(255,255,255,0.18)" }}>
                      Toca una casilla y escribe con el teclado
                    </p>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-center text-xs mb-4"
                          style={{ color: "#f87171" }}
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Confirm button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmit}
                      disabled={!filled || loading || verified}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-300 text-white"
                      style={{
                        background: verified
                          ? "linear-gradient(135deg, #10b981, #059669)"
                          : filled
                            ? "linear-gradient(135deg, #10b981, #047857)"
                            : "rgba(16,185,129,0.15)",
                        border: filled || verified
                          ? "none"
                          : "1px solid rgba(16,185,129,0.2)",
                        boxShadow: filled || verified
                          ? "0 0 32px rgba(16,185,129,0.4), 0 8px 24px rgba(0,0,0,0.3)"
                          : "none",
                        opacity: (!filled && !verified) ? 0.5 : 1,
                        cursor: (!filled || loading || verified) ? "not-allowed" : "pointer",
                      }}
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : verified ? (
                        <>
                          <ShieldCheck size={18} />
                          Verificado
                        </>
                      ) : (
                        <>
                          <Shield size={16} />
                          Confirmar
                        </>
                      )}
                    </motion.button>

                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default WithdrawPinModal
