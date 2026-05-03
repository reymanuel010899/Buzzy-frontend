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
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-xl p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="relative w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/8"
              style={{ background: "rgba(5,7,20,0.97)", backdropFilter: "blur(30px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* glow blobs */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#ffcc00]/8 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#10b981]/6 rounded-full blur-3xl pointer-events-none" />

              {/* header */}
              <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffcc00]/10 border border-[#ffcc00]/20">
                    <Shield size={20} className="text-[#ffcc00]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffcc00]/60">Wallet</p>
                    <h2 className="text-lg font-black text-white leading-tight">Confirmar retiro</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-white/40 hover:text-white hover:bg-white/5 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* body */}
              <div className="relative z-10 px-5 py-5">

                {/* loading check */}
                {checkingPin && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={28} className="animate-spin text-[#ffcc00]/60" />
                    <p className="text-xs text-white/30 uppercase tracking-widest">Verificando...</p>
                  </div>
                )}

                {/* no PIN configured */}
                {!checkingPin && hasPin === false && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center py-6"
                  >
                    <div className="relative mb-5">
                      <div className="absolute inset-0 rounded-full bg-[#ffcc00]/20 blur-2xl" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/4">
                        <Lock size={30} className="text-[#ffcc00]" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">No tienes PIN configurado</h3>
                    <p className="text-sm text-white/45 leading-6 max-w-[260px] mb-7">
                      Para retirar fondos necesitas crear tu PIN de seguridad de 6 dígitos en Privacidad de chats.
                    </p>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={onConfigurePin}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm text-black transition hover:scale-[1.02]"
                      style={{ background: "linear-gradient(135deg, #ffcc00, #f59e0b)", boxShadow: "0 0 24px rgba(255,204,0,0.25)" }}
                    >
                      Configurar PIN ahora
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ArrowRight size={16} />
                      </motion.div>
                    </motion.button>
                  </motion.div>
                )}

                {/* PIN entry */}
                {!checkingPin && hasPin === true && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    animate-shake={shake ? "shake" : undefined}
                  >
                    <motion.div
                      animate={shake ? { x: [0, -10, 10, -7, 7, 0] } : { x: 0 }}
                      transition={{ duration: 0.38 }}
                    >
                      {/* info box */}
                      <div className="mb-5 rounded-2xl border border-white/6 bg-white/3 px-4 py-3">
                        <p className="text-sm font-semibold text-white">Ingresa tu PIN de seguridad</p>
                        <p className="text-xs text-white/40 mt-0.5 leading-5">
                          Por tu seguridad, necesitamos verificar tu identidad antes de procesar el retiro.
                        </p>
                      </div>

                      {/* hidden input */}
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
                      <div className="grid grid-cols-6 gap-2 mb-4">
                        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                          <motion.div
                            key={i}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSlotClick(i)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleSlotClick(i)
                            }}
                            animate={verified ? { scale: [1, 1.15, 1] } : {}}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                            className={`flex h-12 items-center justify-center rounded-2xl border transition-all duration-200 cursor-pointer ${
                              verified
                                ? "border-[#10b981]/60 bg-[#10b981]/15"
                                : i === activeIndex && pin.length < PIN_LENGTH
                                ? "border-[#ffcc00]/60 bg-[#ffcc00]/8 shadow-[0_0_16px_rgba(255,204,0,0.15)]"
                                : pin[i]
                                ? "border-[#ffcc00]/40 bg-[#ffcc00]/6"
                                : "border-white/8 bg-white/3"
                            }`}
                          >
                            {verified ? (
                              <div className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                            ) : (
                              <div className={`h-2.5 w-2.5 rounded-full transition-all duration-150 ${
                                pin[i] ? "bg-[#ffcc00] scale-100" : "bg-white/15 scale-75"
                              }`} />
                            )}
                          </motion.div>
                        ))}
                      </div>

                      <p className="text-center text-[10px] uppercase tracking-[0.25em] text-white/20 mb-4">
                        Toca una casilla y escribe con el teclado
                      </p>

                      <AnimatePresence>
                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center text-xs text-red-400 mb-4"
                          >
                            {error}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSubmit}
                        disabled={!filled || loading || verified}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: verified
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : "linear-gradient(135deg, #ffcc00, #f59e0b)",
                          boxShadow: verified
                            ? "0 0 24px rgba(16,185,129,0.35)"
                            : filled
                            ? "0 0 24px rgba(255,204,0,0.3)"
                            : "none",
                          color: "#000",
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

    </>
  )
}

export default WithdrawPinModal
