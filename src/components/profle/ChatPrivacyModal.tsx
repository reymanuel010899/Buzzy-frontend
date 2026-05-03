import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ShieldCheck, LockKeyhole, Trash2, X, KeyRound } from "lucide-react";
import { getChatPrivacyStatus, saveChatPrivacyPin } from "../../redux/actions/chatPrivacy";

type ChatPrivacyStatus = {
  has_pin: boolean;
  hidden_verified: boolean;
  hidden_verified_at: string | null;
  updated_at: string | null;
};

interface ChatPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PIN_LENGTH = 6;
type PrivacyMode = "summary" | "create" | "change";

const emptyStatus: ChatPrivacyStatus = {
  has_pin: false,
  hidden_verified: false,
  hidden_verified_at: null,
  updated_at: null,
};

const PinSlots = ({
  value,
  onChange,
  label,
  accentColor = "#ffcc00",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  accentColor?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">{label}</p>
      <div
        className="grid gap-2 cursor-text"
        style={{ gridTemplateColumns: `repeat(${PIN_LENGTH}, 1fr)` }}
        onClick={() => inputRef.current?.focus()}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className="flex h-11 items-center justify-center rounded-xl border transition-all duration-150"
            style={{
              borderColor: i === value.length && document.activeElement === inputRef.current
                ? `${accentColor}80`
                : value[i] ? `${accentColor}50` : "rgba(255,255,255,0.08)",
              background: value[i] ? `${accentColor}08` : "rgba(255,255,255,0.03)",
              boxShadow: i === value.length && document.activeElement === inputRef.current
                ? `0 0 12px ${accentColor}20` : "none",
            }}
          >
            <div
              className="h-2.5 w-2.5 rounded-full transition-all duration-150"
              style={{
                background: value[i] ? accentColor : "rgba(255,255,255,0.15)",
                transform: value[i] ? "scale(1)" : "scale(0.75)",
              }}
            />
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={PIN_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
        className="sr-only"
      />
    </div>
  );
};

const ChatPrivacyModal: React.FC<ChatPrivacyModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<ChatPrivacyStatus>(emptyStatus);
  const [mode, setMode] = useState<PrivacyMode>("create");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const resetFields = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    getChatPrivacyStatus()
      .then((data) => {
        setStatus(data);
        setMode(data.has_pin ? "summary" : "create");
      })
      .catch((err: any) => setError(err?.response?.data?.error || "Error al cargar"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetFields();
      setMode(status.has_pin ? "summary" : "create");
    }
  }, [isOpen, status.has_pin]);

  const handleSubmit = async (removePin = false) => {
    if (!removePin) {
      if (!newPin || newPin.length !== PIN_LENGTH) {
        setError("El PIN debe tener 6 dígitos");
        return;
      }
      if (newPin !== confirmPin) {
        setError("Los PINs no coinciden");
        return;
      }
      if (status.has_pin && mode === "change" && !currentPin) {
        setError("Ingresa tu PIN actual");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await saveChatPrivacyPin({
        current_pin: status.has_pin && mode === "change" ? currentPin : undefined,
        new_pin: removePin ? undefined : newPin,
        confirm_pin: removePin ? undefined : confirmPin,
        remove_pin: removePin,
      });
      localStorage.removeItem("hiddenChatAccessToken");
      const refreshed = await getChatPrivacyStatus();
      setStatus(refreshed);
      resetFields();
      setMode(refreshed.has_pin ? "summary" : "create");
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "No pudimos guardar tu PIN");
    } finally {
      setSaving(false);
    }
  };

  const canSave = mode === "create"
    ? newPin.length === PIN_LENGTH && confirmPin.length === PIN_LENGTH
    : currentPin.length === PIN_LENGTH && newPin.length === PIN_LENGTH && confirmPin.length === PIN_LENGTH;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-xl p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="relative w-full max-w-[380px] overflow-hidden rounded-[32px] border border-white/8"
            style={{ background: "rgba(5,7,20,0.97)", backdropFilter: "blur(30px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* glow blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-28 bg-[#ffcc00]/6 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#7000ff]/6 rounded-full blur-3xl pointer-events-none" />

            {/* header */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffcc00]/10 border border-[#ffcc00]/20">
                  <KeyRound size={18} className="text-[#ffcc00]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffcc00]/55">Seguridad</p>
                  <h2 className="text-lg font-black text-white leading-tight">
                    {mode === "create" ? "Crear PIN" : mode === "change" ? "Cambiar PIN" : "PIN configurado"}
                  </h2>
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
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={26} className="animate-spin text-[#ffcc00]/50" />
                </div>
              ) : (
                <>
                  {/* status pill */}
                  <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/3 px-4 py-3 mb-5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                      status.has_pin ? "bg-[#10b981]/15" : "bg-[#ffcc00]/10"
                    }`}>
                      {status.has_pin
                        ? <ShieldCheck size={18} className="text-[#10b981]" />
                        : <LockKeyhole size={18} className="text-[#ffcc00]" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {status.has_pin ? "PIN activo" : "Sin PIN configurado"}
                      </p>
                      <p className="text-xs text-white/35 leading-5">
                        {status.has_pin
                          ? "Tu PIN protege retiros y chats ocultos."
                          : "Crea tu clave de 6 dígitos para continuar."}
                      </p>
                    </div>
                  </div>

                  {/* summary mode */}
                  {mode === "summary" && (
                    <div className="flex flex-col gap-2">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setMode("change")}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-black"
                        style={{ background: "linear-gradient(135deg, #ffcc00, #f59e0b)", boxShadow: "0 0 20px rgba(255,204,0,0.2)" }}
                      >
                        <KeyRound size={15} />
                        Cambiar PIN
                      </motion.button>
                    </div>
                  )}

                  {/* create / change mode */}
                  {(mode === "create" || mode === "change") && (
                    <div className="space-y-4">
                      {mode === "change" && (
                        <PinSlots
                          value={currentPin}
                          onChange={setCurrentPin}
                          label="PIN actual"
                          accentColor="#a78bfa"
                        />
                      )}
                      <PinSlots
                        value={newPin}
                        onChange={setNewPin}
                        label={mode === "create" ? "Crear PIN" : "Nuevo PIN"}
                        accentColor="#ffcc00"
                      />
                      <PinSlots
                        value={confirmPin}
                        onChange={setConfirmPin}
                        label="Confirmar PIN"
                        accentColor="#ffcc00"
                      />

                      <AnimatePresence>
                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xs text-red-400 text-center"
                          >
                            {error}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSubmit(false)}
                        disabled={saving || !canSave}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: "linear-gradient(135deg, #ffcc00, #f59e0b)",
                          boxShadow: canSave ? "0 0 24px rgba(255,204,0,0.3)" : "none",
                        }}
                      >
                        {saving
                          ? <Loader2 size={16} className="animate-spin" />
                          : <ShieldCheck size={16} />
                        }
                        {status.has_pin ? "Actualizar PIN" : "Guardar PIN"}
                      </motion.button>

                      {mode === "change" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { resetFields(); setMode("summary"); }}
                            className="flex-1 py-2.5 rounded-2xl text-xs font-semibold text-white/40 hover:text-white border border-white/6 hover:border-white/15 transition"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSubmit(true)}
                            disabled={saving}
                            className="flex-1 py-2.5 rounded-2xl text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/8 transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                            Desactivar
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* security note */}
                  <p className="mt-4 text-center text-[10px] text-white/20 leading-5">
                    Tu PIN se guarda cifrado. Nunca en texto plano.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPrivacyModal;
