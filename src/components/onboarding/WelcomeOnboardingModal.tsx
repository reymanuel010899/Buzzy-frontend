import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Phone, ChevronRight, Sparkles, ChevronDown,
  MapPin, PartyPopper, Check, RefreshCw, ShieldCheck, Gift, Zap, Star,
} from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "../../firebase";
import { apiClient } from "../../redux/client/api-client";

const COUNTRIES = [
  { name: "Afghanistan", code: "AF", dial: "+93" },
  { name: "Albania", code: "AL", dial: "+355" },
  { name: "Algeria", code: "DZ", dial: "+213" },
  { name: "Argentina", code: "AR", dial: "+54" },
  { name: "Armenia", code: "AM", dial: "+374" },
  { name: "Australia", code: "AU", dial: "+61" },
  { name: "Austria", code: "AT", dial: "+43" },
  { name: "Azerbaijan", code: "AZ", dial: "+994" },
  { name: "Bahrain", code: "BH", dial: "+973" },
  { name: "Bangladesh", code: "BD", dial: "+880" },
  { name: "Belarus", code: "BY", dial: "+375" },
  { name: "Belgium", code: "BE", dial: "+32" },
  { name: "Bolivia", code: "BO", dial: "+591" },
  { name: "Bosnia and Herzegovina", code: "BA", dial: "+387" },
  { name: "Brazil", code: "BR", dial: "+55" },
  { name: "Bulgaria", code: "BG", dial: "+359" },
  { name: "Cambodia", code: "KH", dial: "+855" },
  { name: "Cameroon", code: "CM", dial: "+237" },
  { name: "Canada", code: "CA", dial: "+1" },
  { name: "Chile", code: "CL", dial: "+56" },
  { name: "China", code: "CN", dial: "+86" },
  { name: "Colombia", code: "CO", dial: "+57" },
  { name: "Costa Rica", code: "CR", dial: "+506" },
  { name: "Croatia", code: "HR", dial: "+385" },
  { name: "Cuba", code: "CU", dial: "+53" },
  { name: "Czech Republic", code: "CZ", dial: "+420" },
  { name: "Denmark", code: "DK", dial: "+45" },
  { name: "Dominican Republic", code: "DO", dial: "+1" },
  { name: "Ecuador", code: "EC", dial: "+593" },
  { name: "Egypt", code: "EG", dial: "+20" },
  { name: "El Salvador", code: "SV", dial: "+503" },
  { name: "Estonia", code: "EE", dial: "+372" },
  { name: "Ethiopia", code: "ET", dial: "+251" },
  { name: "Finland", code: "FI", dial: "+358" },
  { name: "France", code: "FR", dial: "+33" },
  { name: "Georgia", code: "GE", dial: "+995" },
  { name: "Germany", code: "DE", dial: "+49" },
  { name: "Ghana", code: "GH", dial: "+233" },
  { name: "Greece", code: "GR", dial: "+30" },
  { name: "Guatemala", code: "GT", dial: "+502" },
  { name: "Haiti", code: "HT", dial: "+509" },
  { name: "Honduras", code: "HN", dial: "+504" },
  { name: "Hungary", code: "HU", dial: "+36" },
  { name: "Iceland", code: "IS", dial: "+354" },
  { name: "India", code: "IN", dial: "+91" },
  { name: "Indonesia", code: "ID", dial: "+62" },
  { name: "Iran", code: "IR", dial: "+98" },
  { name: "Iraq", code: "IQ", dial: "+964" },
  { name: "Ireland", code: "IE", dial: "+353" },
  { name: "Israel", code: "IL", dial: "+972" },
  { name: "Italy", code: "IT", dial: "+39" },
  { name: "Jamaica", code: "JM", dial: "+1" },
  { name: "Japan", code: "JP", dial: "+81" },
  { name: "Jordan", code: "JO", dial: "+962" },
  { name: "Kazakhstan", code: "KZ", dial: "+7" },
  { name: "Kenya", code: "KE", dial: "+254" },
  { name: "Kuwait", code: "KW", dial: "+965" },
  { name: "Latvia", code: "LV", dial: "+371" },
  { name: "Lebanon", code: "LB", dial: "+961" },
  { name: "Libya", code: "LY", dial: "+218" },
  { name: "Lithuania", code: "LT", dial: "+370" },
  { name: "Luxembourg", code: "LU", dial: "+352" },
  { name: "Malaysia", code: "MY", dial: "+60" },
  { name: "Maldives", code: "MV", dial: "+960" },
  { name: "Mali", code: "ML", dial: "+223" },
  { name: "Malta", code: "MT", dial: "+356" },
  { name: "Mexico", code: "MX", dial: "+52" },
  { name: "Moldova", code: "MD", dial: "+373" },
  { name: "Monaco", code: "MC", dial: "+377" },
  { name: "Mongolia", code: "MN", dial: "+976" },
  { name: "Montenegro", code: "ME", dial: "+382" },
  { name: "Morocco", code: "MA", dial: "+212" },
  { name: "Mozambique", code: "MZ", dial: "+258" },
  { name: "Myanmar", code: "MM", dial: "+95" },
  { name: "Namibia", code: "NA", dial: "+264" },
  { name: "Nepal", code: "NP", dial: "+977" },
  { name: "Netherlands", code: "NL", dial: "+31" },
  { name: "New Zealand", code: "NZ", dial: "+64" },
  { name: "Nicaragua", code: "NI", dial: "+505" },
  { name: "Nigeria", code: "NG", dial: "+234" },
  { name: "Norway", code: "NO", dial: "+47" },
  { name: "Oman", code: "OM", dial: "+968" },
  { name: "Pakistan", code: "PK", dial: "+92" },
  { name: "Panama", code: "PA", dial: "+507" },
  { name: "Paraguay", code: "PY", dial: "+595" },
  { name: "Peru", code: "PE", dial: "+51" },
  { name: "Philippines", code: "PH", dial: "+63" },
  { name: "Poland", code: "PL", dial: "+48" },
  { name: "Portugal", code: "PT", dial: "+351" },
  { name: "Puerto Rico", code: "PR", dial: "+1" },
  { name: "Qatar", code: "QA", dial: "+974" },
  { name: "Romania", code: "RO", dial: "+40" },
  { name: "Russia", code: "RU", dial: "+7" },
  { name: "Rwanda", code: "RW", dial: "+250" },
  { name: "Saudi Arabia", code: "SA", dial: "+966" },
  { name: "Senegal", code: "SN", dial: "+221" },
  { name: "Serbia", code: "RS", dial: "+381" },
  { name: "Singapore", code: "SG", dial: "+65" },
  { name: "Slovakia", code: "SK", dial: "+421" },
  { name: "Slovenia", code: "SI", dial: "+386" },
  { name: "Somalia", code: "SO", dial: "+252" },
  { name: "South Africa", code: "ZA", dial: "+27" },
  { name: "South Korea", code: "KR", dial: "+82" },
  { name: "Spain", code: "ES", dial: "+34" },
  { name: "Sri Lanka", code: "LK", dial: "+94" },
  { name: "Sudan", code: "SD", dial: "+249" },
  { name: "Sweden", code: "SE", dial: "+46" },
  { name: "Switzerland", code: "CH", dial: "+41" },
  { name: "Syria", code: "SY", dial: "+963" },
  { name: "Taiwan", code: "TW", dial: "+886" },
  { name: "Tanzania", code: "TZ", dial: "+255" },
  { name: "Thailand", code: "TH", dial: "+66" },
  { name: "Tunisia", code: "TN", dial: "+216" },
  { name: "Turkey", code: "TR", dial: "+90" },
  { name: "Uganda", code: "UG", dial: "+256" },
  { name: "Ukraine", code: "UA", dial: "+380" },
  { name: "United Arab Emirates", code: "AE", dial: "+971" },
  { name: "United Kingdom", code: "GB", dial: "+44" },
  { name: "United States", code: "US", dial: "+1" },
  { name: "Uruguay", code: "UY", dial: "+598" },
  { name: "Uzbekistan", code: "UZ", dial: "+998" },
  { name: "Venezuela", code: "VE", dial: "+58" },
  { name: "Vietnam", code: "VN", dial: "+84" },
  { name: "Yemen", code: "YE", dial: "+967" },
  { name: "Zambia", code: "ZM", dial: "+260" },
  { name: "Zimbabwe", code: "ZW", dial: "+263" },
].sort((a, b) => a.name.localeCompare(b.name));

const COUNTDOWN_SECONDS = 120;
const MAX_RESEND_ATTEMPTS = 5;

interface Props {
  user: any;
  onComplete: () => void;
}

type Step = "form" | "verify" | "welcome" | "tokens";

const FloatingDot = ({ style }: { style: React.CSSProperties }) => (
  <motion.div
    className="absolute w-1 h-1 rounded-full bg-white/20"
    style={style}
    animate={{ y: [0, -14, 0], opacity: [0.15, 0.5, 0.15] }}
    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
  />
);

const WelcomeOnboardingModal: React.FC<Props> = ({ user, onComplete }) => {

  // Step state
  const [step, setStep] = useState<Step>("form");

  // Form step state
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null);
  const [dialCountry, setDialCountry] = useState(COUNTRIES.find((c) => c.code === "US")!);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showDialDropdown, setShowDialDropdown] = useState(false);
  const [dialSearch, setDialSearch] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Verify step state
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);

  const [referralCodeUsedWarning, setReferralCodeUsedWarning] = useState(false);

  // Tokens reales del wallet (se cargan al llegar al step "tokens")
  const [walletTokens, setWalletTokens] = useState<number | null>(null);

  useEffect(() => {
    if (step !== "tokens") return;
    apiClient.get("/api/get-wallet/").then((res) => {
      const wallet = Array.isArray(res.data) ? res.data[0] : res.data;
      if (wallet?.tokens !== undefined) setWalletTokens(wallet.tokens);
    }).catch(() => {});
  }, [step]);

  // Firebase
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fullPhone = `${dialCountry.dial}${phoneNumber.trim()}`;

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "verify") return;
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [step, countdown]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Inicializar reCAPTCHA invisible ──────────────────────────────────────
  const initRecaptcha = useCallback(() => {
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
    recaptchaRef.current = new RecaptchaVerifier("recaptcha-container", {
      size: "invisible",
    }, auth);
    return recaptchaRef.current;
  }, []);

  // ── Enviar SMS ────────────────────────────────────────────────────────────
  const sendSms = async () => {
    const verifier = initRecaptcha();
    const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
    confirmationRef.current = result;
  };

  // ── Paso 1: enviar número ─────────────────────────────────────────────────
  const handleSubmitPhone = async () => {
    if (!selectedCountry) { setFormError("Selecciona tu país"); return; }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 6) {
      setFormError("Ingresa un número válido");
      return;
    }
    setFormError("");
    setFormLoading(true);
    try {
      await sendSms();
      setCountdown(COUNTDOWN_SECONDS);
      setCode(["", "", "", "", "", ""]);
      setVerifyError("");
      setStep("verify");
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("invalid-phone-number") || msg.includes("INVALID_PHONE_NUMBER")) {
        setFormError("Número de teléfono inválido. Revisa el código de país.");
      } else if (msg.includes("too-many-requests") || msg.includes("TOO_MANY_ATTEMPTS")) {
        setFormError("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
      } else {
        setFormError("No se pudo enviar el SMS. Intenta de nuevo.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // ── Paso 2: inputs del código (OTP estilo 6 cajas) ────────────────────────
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      codeInputRefs.current[5]?.focus();
    }
  };

  // ── Paso 2: verificar código ──────────────────────────────────────────────
  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setVerifyError("Ingresa los 6 dígitos del código.");
      return;
    }
    if (!confirmationRef.current) {
      setVerifyError("Sesión expirada. Vuelve atrás y reenvía el código.");
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const result = await confirmationRef.current.confirm(fullCode);
      const firebaseToken = await result.user.getIdToken();

      const verifyRes = await apiClient.post("/api/auth/verify-phone/", {
        firebase_token: firebaseToken,
        phone_number: fullPhone,
      });

      if (verifyRes.data?.referral_code_used) {
        setReferralCodeUsedWarning(true);
      }

      setStep("welcome");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        const blockedUntilStr = err.response?.data?.blocked_until;
        if (blockedUntilStr) setBlockedUntil(new Date(blockedUntilStr));
        setVerifyError(err.response?.data?.error ?? "Bloqueado por demasiados intentos.");
      } else if (status === 409) {
        setVerifyError("Este número ya está registrado en otra cuenta.");
      } else if (err?.code === "auth/invalid-verification-code") {
        setVerifyError(`Código incorrecto. Intentos restantes: ${err?.response?.data?.attempts_left ?? "?"}`);
      } else if (err?.code === "auth/code-expired") {
        setVerifyError("El código expiró. Reenvía un nuevo código.");
      } else {
        setVerifyError("Código incorrecto o expirado. Intenta de nuevo.");
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Reenviar código ───────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendAttempts >= MAX_RESEND_ATTEMPTS) return;
    setResendLoading(true);
    setVerifyError("");
    try {
      await sendSms();
      setResendAttempts((a) => a + 1);
      setCountdown(COUNTDOWN_SECONDS);
      setCode(["", "", "", "", "", ""]);
      codeInputRefs.current[0]?.focus();
    } catch {
      setVerifyError("No se pudo reenviar el código. Intenta de nuevo.");
    } finally {
      setResendLoading(false);
    }
  };

  const canResend = countdown === 0 && resendAttempts < MAX_RESEND_ATTEMPTS && !blockedUntil;
  const filteredDialCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(dialSearch.toLowerCase()) ||
      c.dial.includes(dialSearch)
  );

  return (
    <div
      className={`fixed inset-0 z-[9999] flex justify-center bg-black/80 backdrop-blur-md ${step === "tokens" ? "items-center" : "items-end sm:items-center"}`}
      onClick={() => setShowDialDropdown(false)}
    >
      {/* reCAPTCHA invisible — Firebase lo necesita en el DOM */}
      <div id="recaptcha-container" />

      <AnimatePresence mode="wait">

        {/* ══════════════ STEP 1: FORM ══════════════ */}
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="relative w-full sm:max-w-sm bg-[#0c0c14] sm:rounded-3xl rounded-t-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-44 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#0a1628] to-[#0c0c14]" />
              <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl" />
              <div className="absolute -bottom-6 right-0 w-40 h-40 rounded-full bg-blue-600/25 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              {[
                { top: "20%", left: "15%", animationDelay: "0s" },
                { top: "55%", left: "72%", animationDelay: "1.2s" },
                { top: "75%", left: "30%", animationDelay: "0.6s" },
                { top: "30%", left: "85%", animationDelay: "1.8s" },
              ].map((s, i) => <FloatingDot key={i} style={s} />)}

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 18 }}
                  className="relative"
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-cyan-400/30"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/40">
                    <Phone className="w-8 h-8 text-white" strokeWidth={1.8} />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="text-center"
                >
                  <p className="text-white font-black text-xl tracking-tight">Un último paso</p>
                  <p className="text-cyan-300/70 text-xs font-medium mt-0.5">Agrega tu país y celular para continuar</p>
                </motion.div>
              </div>
            </div>

            <div className="px-5 pt-5 pb-6 space-y-3">
              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-2.5 rounded-2xl text-sm font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {formError}
                </motion.div>
              )}

              {/* Campo país */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.45 }}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
                  selectedCountry ? "border-cyan-500/50 bg-cyan-500/5" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${selectedCountry ? "bg-cyan-500/20" : "bg-white/5"}`}>
                  <MapPin className={`w-4 h-4 transition-colors ${selectedCountry ? "text-cyan-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">Tu país</p>
                  <select
                    value={selectedCountry?.code ?? ""}
                    onChange={(e) => {
                      const found = COUNTRIES.find((c) => c.code === e.target.value);
                      if (found) { setSelectedCountry(found); setDialCountry(found); }
                    }}
                    className="w-full bg-transparent border-none text-sm font-semibold focus:outline-none appearance-none cursor-pointer pr-6"
                    style={{ color: selectedCountry ? "white" : "#4b5563" }}
                  >
                    <option value="" disabled style={{ background: "#0c0c14", color: "#4b5563" }}>Selecciona tu país</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} style={{ background: "#0c0c14", color: "white" }}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedCountry ? (
                  <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0 pointer-events-none" />
                )}
              </motion.div>

              {/* Campo celular */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.45 }}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
                  phoneNumber ? "border-purple-500/50 bg-purple-500/5" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${phoneNumber ? "bg-purple-500/20" : "bg-white/5"}`}>
                  <Phone className={`w-4 h-4 transition-colors ${phoneNumber ? "text-purple-400" : "text-gray-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">Número de celular</p>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* selector código */}
                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowDialDropdown((v) => !v)}
                        className="flex items-center gap-1 py-0.5 pr-1.5 text-sm font-bold text-gray-300 hover:text-white transition-colors focus:outline-none"
                      >
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                        <span>{dialCountry.dial}</span>
                        <ChevronDown className="w-3 h-3 text-gray-600" />
                      </button>
                      <AnimatePresence>
                        {showDialDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                            transition={{ duration: 0.16 }}
                            className="absolute top-full mt-2 left-0 w-72 bg-[#0e0e18] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                          >
                            <div className="p-2 border-b border-white/[0.07]">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Buscar país o código..."
                                value={dialSearch}
                                onChange={(e) => setDialSearch(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                              />
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                              {filteredDialCountries.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => { setDialCountry(c); setShowDialDropdown(false); setDialSearch(""); }}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors ${
                                    dialCountry.code === c.code ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-gray-300"
                                  }`}
                                >
                                  <span className="font-bold text-xs text-gray-500 w-12 flex-shrink-0">{c.dial}</span>
                                  <span className="truncate">{c.name}</span>
                                </button>
                              ))}
                              {filteredDialCountries.length === 0 && (
                                <p className="text-center text-gray-600 text-sm py-5">Sin resultados</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="w-px h-4 bg-white/15 flex-shrink-0" />

                    <input
                      type="tel"
                      placeholder="8091234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 bg-transparent border-none text-sm font-semibold text-white placeholder-gray-600 focus:outline-none min-w-0"
                    />
                  </div>
                </div>
                {phoneNumber && (
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </motion.div>

              {/* Botón siguiente */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.45 }}
                onClick={handleSubmitPhone}
                disabled={formLoading || !phoneNumber.trim() || !selectedCountry}
                className="relative w-full overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 rounded-2xl" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                />
                <div className="relative flex items-center justify-center gap-2 py-4 text-white font-black text-sm tracking-wider">
                  {formLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>SIGUIENTE <ChevronRight className="w-4 h-4" /></>
                  )}
                </div>
              </motion.button>

              <p className="text-center text-xs text-gray-700 pt-1">
                Necesario para completar tu registro en Buzzy
              </p>
            </div>
          </motion.div>
        )}

        {/* ══════════════ STEP 2: VERIFICAR CÓDIGO ══════════════ */}
        {step === "verify" && (
          <motion.div
            key="verify"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="relative w-full sm:max-w-sm bg-[#0c0c14] sm:rounded-3xl rounded-t-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-44 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a3c] via-[#0d1228] to-[#0c0c14]" />
              <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-purple-600/25 blur-3xl" />
              <div className="absolute -bottom-6 -left-6 w-44 h-44 rounded-full bg-cyan-500/20 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              {[
                { top: "20%", left: "10%", animationDelay: "0s" },
                { top: "60%", left: "80%", animationDelay: "0.8s" },
                { top: "40%", left: "50%", animationDelay: "1.4s" },
              ].map((s, i) => <FloatingDot key={i} style={s} />)}

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 18 }}
                  className="relative"
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-purple-400/30"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/40">
                    <ShieldCheck className="w-8 h-8 text-white" strokeWidth={1.8} />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-center"
                >
                  <p className="text-white font-black text-xl tracking-tight">Verifica tu número</p>
                  <p className="text-purple-300/70 text-xs font-medium mt-0.5">
                    Código enviado a {fullPhone}
                  </p>
                </motion.div>
              </div>
            </div>

            <div className="px-5 pt-5 pb-6 space-y-4">
              {verifyError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-2.5 rounded-2xl text-sm font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {verifyError}
                </motion.div>
              )}

              {/* 6 inputs OTP */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center gap-2"
                onPaste={handleCodePaste}
              >
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { codeInputRefs.current[i] = el; }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className={`w-11 h-14 text-center text-xl font-black rounded-2xl border bg-white/[0.03] text-white focus:outline-none transition-all duration-200 ${
                      digit
                        ? "border-purple-500/70 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                        : "border-white/10 focus:border-purple-500/50"
                    }`}
                  />
                ))}
              </motion.div>

              {/* Countdown + reenviar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-2"
              >
                {countdown > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className={`text-2xl font-black tabular-nums ${countdown <= 30 ? "text-red-400" : "text-cyan-400"}`}>
                      {formatCountdown(countdown)}
                    </div>
                  </div>
                ) : null}

                {blockedUntil ? (
                  <p className="text-red-400 text-xs font-semibold text-center">
                    Bloqueado hasta {blockedUntil.toLocaleTimeString()}. Demasiados reenvíos.
                  </p>
                ) : resendAttempts >= MAX_RESEND_ATTEMPTS ? (
                  <p className="text-red-400 text-xs font-semibold text-center">
                    Alcanzaste el límite de reenvíos. Espera 24 horas.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || resendLoading}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                      canResend && !resendLoading
                        ? "text-cyan-400 hover:text-cyan-300"
                        : "text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    {resendLoading ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {countdown > 0
                      ? `Reenviar en ${formatCountdown(countdown)}`
                      : `Reenviar código ${resendAttempts > 0 ? `(${MAX_RESEND_ATTEMPTS - resendAttempts} restantes)` : ""}`}
                  </button>
                )}
              </motion.div>

              {/* Botón verificar */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={handleVerifyCode}
                disabled={verifyLoading || code.join("").length < 6}
                className="relative w-full overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 rounded-2xl" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
                />
                <div className="relative flex items-center justify-center gap-2 py-4 text-white font-black text-sm tracking-wider">
                  {verifyLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>VERIFICAR <ShieldCheck className="w-4 h-4" /></>
                  )}
                </div>
              </motion.button>

              <button
                type="button"
                onClick={() => { setStep("form"); setVerifyError(""); }}
                className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors pt-1"
              >
                ← Cambiar número
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════ STEP 3: BIENVENIDA ══════════════ */}
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="relative w-full sm:max-w-sm bg-[#0c0c14] sm:rounded-3xl rounded-t-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-52 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a3c] via-[#0d1228] to-[#0c0c14]" />
              <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-purple-600/25 blur-3xl" />
              <div className="absolute -bottom-6 -left-6 w-44 h-44 rounded-full bg-cyan-500/20 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
                  className="relative"
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-purple-400/30"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                  />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-purple-500/40">
                    <Sparkles className="w-8 h-8 text-white" strokeWidth={1.8} />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-center"
                >
                  <p className="text-white font-black text-xl tracking-tight">¡Bienvenido a Buzzy!</p>
                  {user?.name && (
                    <p className="text-purple-300/80 text-sm font-semibold mt-1">
                      Hola, {user.name.split(" ")[0]} 👋
                    </p>
                  )}
                </motion.div>
              </div>
            </div>

            <div className="px-5 pt-4 pb-6 space-y-3">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="text-sm text-gray-500 text-center pb-1 leading-relaxed"
              >
                Tu perfil está listo. Descubre contenido, conecta con creadores y comparte tus momentos.
              </motion.p>

              {referralCodeUsedWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 px-4 py-2.5 rounded-2xl text-sm font-semibold"
                >
                  <span className="text-base">⚠️</span>
                  <span>El código de referido ya fue usado por alguien más.</span>
                </motion.div>
              )}

              <div className="space-y-2">
                {[
                  { emoji: "🎬", label: "Videos", desc: "Descubre contenido viral", color: "from-rose-500/20 to-orange-500/10", border: "border-rose-500/15", delay: 0.4 },
                  { emoji: "🎁", label: "Regalos", desc: "Envía y recibe regalos virtuales", color: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/15", delay: 0.5 },
                  { emoji: "✨", label: "Crear", desc: "Comparte tus mejores momentos", color: "from-violet-500/20 to-blue-500/10", border: "border-violet-500/15", delay: 0.6 },
                ].map((item) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: item.delay, duration: 0.4 }}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-gradient-to-r ${item.color} border ${item.border}`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="text-white font-bold text-sm">{item.label}</p>
                      <p className="text-gray-500 text-xs">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.45 }}
                onClick={() => setStep("tokens")}
                className="relative w-full overflow-hidden mt-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 rounded-2xl" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
                />
                <div className="relative flex items-center justify-center gap-2 py-4 text-white font-black text-sm tracking-wider">
                  <PartyPopper className="w-4 h-4" />
                  ¡EMPEZAR A EXPLORAR!
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === "tokens" && (
          <motion.div
            key="tokens"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="relative w-full max-w-xs mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Partículas flotantes de fondo */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: ["#f59e0b","#a78bfa","#34d399","#60a5fa","#f472b6"][i % 5],
                  left: `${8 + (i * 7.5) % 84}%`,
                  top: `${5 + (i * 13) % 90}%`,
                }}
                animate={{
                  y: [0, -18, 0],
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.4, 0.8],
                }}
                transition={{
                  duration: 1.8 + (i % 4) * 0.4,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}

            <div className="relative bg-[#0c0c14] rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl shadow-amber-500/10">
              {/* Glow de fondo */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/8 via-transparent to-purple-600/10 pointer-events-none" />
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

              {/* Botón cerrar X */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileTap={{ scale: 0.85 }}
                onClick={onComplete}
                className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </motion.button>

              {/* Cabecera */}
              <div className="relative pt-8 pb-4 flex flex-col items-center gap-3">
                {/* Ícono central con pulso */}
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-amber-400/25"
                    animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-amber-400/15"
                    animate={{ scale: [1, 2.6, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                  />
                  <motion.div
                    className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-300 flex items-center justify-center shadow-xl shadow-amber-500/40"
                    animate={{ rotate: [0, 6, -6, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Gift className="w-9 h-9 text-white drop-shadow" strokeWidth={1.8} />
                  </motion.div>
                </div>

                {/* Número de tokens con contador animado */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 14 }}
                  className="flex flex-col items-center"
                >
                  <div className="flex items-end gap-1">
                    <motion.span
                      className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 leading-none"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      {walletTokens ?? 100}
                    </motion.span>
                    <span className="text-amber-400/80 font-bold text-lg mb-1.5">tokens</span>
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/60 text-xs font-medium tracking-wide mt-0.5"
                  >
                    DE REGALO PARA TI 🎉
                  </motion.p>
                </motion.div>
              </div>

              {/* Separador brillante */}
              <motion.div
                className="mx-5 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.55, duration: 0.6 }}
              />

              {/* Usos de los tokens */}
              <div className="px-5 pt-4 pb-6 space-y-2.5">
                {[
                  { icon: <Gift className="w-4 h-4" />, color: "text-rose-400", bg: "bg-rose-500/15", label: "Envía regalos a tus creadores favoritos" },
                  { icon: <Zap  className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/15", label: "Impulsa tus videos con boost de tokens" },
                  { icon: <Star className="w-4 h-4" />, color: "text-purple-400", bg: "bg-purple-500/15", label: "Desbloquea contenido y beneficios exclusivos" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.12, duration: 0.4 }}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5"
                  >
                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      {item.icon}
                    </div>
                    <p className="text-gray-300 text-xs font-medium leading-snug">{item.label}</p>
                  </motion.div>
                ))}
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default WelcomeOnboardingModal;
