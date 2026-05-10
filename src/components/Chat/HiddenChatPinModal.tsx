import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, Lock, Shield, ShieldCheck, X } from "lucide-react";

interface HiddenChatPinModalProps {
  isOpen: boolean;
  hasPin: boolean;
  onClose: () => void;
  onVerified?: () => void;
  onConfigurePin: () => void;
  onSubmitPin: (pin: string) => Promise<void>;
}

const PIN_LENGTH = 6;

const HiddenChatPinModal: React.FC<HiddenChatPinModalProps> = ({
  isOpen,
  hasPin,
  onClose,
  onVerified,
  onConfigurePin,
  onSubmitPin,
}) => {
  const [pin, setPin] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [verified, setVerified] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const filled = pin.length === PIN_LENGTH;

  useEffect(() => {
    setPin("");
    setActiveIndex(0);
    setError(null);
    setLoading(false);
    setShake(false);
    setVerified(false);
  }, [isOpen, hasPin]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (loading || verified) return;

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = `${prev}${e.key}`.slice(0, PIN_LENGTH);
        setActiveIndex(Math.min(next.length, PIN_LENGTH - 1));
        return next;
      });
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      setError(null);
      setPin((prev) => {
        const next = prev.slice(0, -1);
        setActiveIndex(Math.max(next.length, 0));
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSlotClick = (index: number) => {
    setActiveIndex(index);
    hiddenInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!filled || loading || verified) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmitPin(pin);
      setVerified(true);
      setTimeout(() => {
        setPin("");
        if (onVerified) onVerified();
        else onClose();
      }, 600);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "PIN incorrecto");
      setShake(true);
      setPin("");
      setActiveIndex(0);
      window.setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filled && !loading && !verified && hasPin) {
      handleSubmit();
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="relative w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/8"
            style={{ background: "rgba(5,7,20,0.97)", backdropFilter: "blur(8px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* glow blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-28 bg-[#00f0ff]/6 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#7000ff]/6 rounded-full blur-3xl pointer-events-none" />

            {/* header */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                  <Shield size={18} className="text-[#00f0ff]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#00f0ff]/55">Ocultos</p>
                  <h2 className="text-lg font-black text-white leading-tight">Acceso seguro</h2>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="rounded-full p-2 text-white/40 hover:text-white hover:bg-white/5 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* body */}
            <div className="relative z-10 px-5 py-5">

              {/* no PIN state */}
              {!hasPin ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center py-6"
                >
                  <div className="relative mb-5">
                    <div className="absolute inset-0 rounded-full bg-[#00f0ff]/15 blur-2xl" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/4">
                      <Lock size={30} className="text-[#00f0ff]" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">Todavía no tienes PIN</h3>
                  <p className="text-sm text-white/45 leading-6 max-w-[260px] mb-7">
                    Para abrir la carpeta Ocultos primero necesitas crear tu clave de 6 dígitos en Privacidad de chats.
                  </p>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onConfigurePin}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #00f0ff, #7000ff)",
                      boxShadow: "0 0 24px rgba(0,240,255,0.2)",
                      color: "#fff",
                    }}
                  >
                    Configurar PIN
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ArrowRight size={16} />
                    </motion.div>
                  </motion.button>
                </motion.div>
              ) : (
                /* PIN entry state */
                <motion.div
                  animate={shake ? { x: [0, -10, 10, -7, 7, 0] } : { x: 0 }}
                  transition={{ duration: 0.38 }}
                >
                  {/* info box */}
                  <div className="mb-5 rounded-2xl border border-white/6 bg-white/3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00f0ff]/10 shrink-0">
                        <KeyRound size={16} className="text-[#00f0ff]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Ingresa tu clave</p>
                        <p className="text-xs text-white/35 leading-5">El acceso vence automáticamente en 5 minutos.</p>
                      </div>
                    </div>
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
                          if (e.key === "Enter" || e.key === " ") handleSlotClick(i);
                        }}
                        animate={verified ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="flex h-12 items-center justify-center rounded-2xl border transition-all duration-200 cursor-pointer"
                        style={{
                          borderColor: verified
                            ? "rgba(16,185,129,0.6)"
                            : i === activeIndex && pin.length < PIN_LENGTH
                            ? "rgba(0,240,255,0.6)"
                            : pin[i]
                            ? "rgba(0,240,255,0.4)"
                            : "rgba(255,255,255,0.08)",
                          background: verified
                            ? "rgba(16,185,129,0.12)"
                            : pin[i] || (i === activeIndex && pin.length < PIN_LENGTH)
                            ? "rgba(0,240,255,0.06)"
                            : "rgba(255,255,255,0.03)",
                          boxShadow: !verified && i === activeIndex && pin.length < PIN_LENGTH
                            ? "0 0 16px rgba(0,240,255,0.15)"
                            : "none",
                        }}
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full transition-all duration-150"
                          style={{
                            background: verified
                              ? "#10b981"
                              : pin[i]
                              ? "#00f0ff"
                              : "rgba(255,255,255,0.15)",
                            transform: pin[i] || verified ? "scale(1)" : "scale(0.75)",
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-center text-[10px] uppercase tracking-[0.25em] text-white/20 mb-5">
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
                        : "linear-gradient(135deg, #00f0ff, #7000ff)",
                      boxShadow: verified
                        ? "0 0 24px rgba(16,185,129,0.35)"
                        : filled
                        ? "0 0 24px rgba(0,240,255,0.25)"
                        : "none",
                      color: "#fff",
                    }}
                  >
                    {loading
                      ? <Loader2 size={18} className="animate-spin" />
                      : verified
                      ? <><ShieldCheck size={18} /> Verificado</>
                      : <><Shield size={16} /> Abrir</>
                    }
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HiddenChatPinModal;
