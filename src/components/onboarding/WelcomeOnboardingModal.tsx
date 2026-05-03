import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Phone, ChevronRight, Sparkles, ChevronDown, MapPin, PartyPopper, Check } from "lucide-react";
import { useDispatch } from "react-redux";
import { updateProfile } from "../../redux/actions/updateProfile";

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

interface Props {
  user: any;
  onComplete: () => void;
}

type Step = "form" | "welcome";

/* pequeños puntos flotantes de fondo */
const FloatingDot = ({ style }: { style: React.CSSProperties }) => (
  <motion.div
    className="absolute w-1 h-1 rounded-full bg-white/20"
    style={style}
    animate={{ y: [0, -14, 0], opacity: [0.15, 0.5, 0.15] }}
    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
  />
);

const WelcomeOnboardingModal: React.FC<Props> = ({ user, onComplete }) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState<Step>("form");
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null);
  const [dialCountry, setDialCountry] = useState(COUNTRIES.find((c) => c.code === "US")!);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showDialDropdown, setShowDialDropdown] = useState(false);
  const [dialSearch, setDialSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredDialCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(dialSearch.toLowerCase()) ||
      c.dial.includes(dialSearch)
  );

  const handleSubmit = async () => {
    if (!selectedCountry) { setError("Selecciona tu país"); return; }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 6) { setError("Ingresa un número válido"); return; }
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.append("phone_number", `${dialCountry.dial}${phoneNumber.trim()}`);
    fd.append("country", selectedCountry.name);
    fd.append("country_code", selectedCountry.code);
    try {
      // @ts-ignore
      await updateProfile(fd)(dispatch);
      setStep("welcome");
    } catch {
      setError("Error al guardar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={() => setShowDialDropdown(false)}
    >
      <AnimatePresence mode="wait">

        {/* ══════════════ STEP 1 ══════════════ */}
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
            {/* ── Banda superior con gradiente ── */}
            <div className="relative h-44 overflow-hidden">
              {/* Gradiente de fondo */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#0a1628] to-[#0c0c14]" />
              {/* Orbe izquierda */}
              <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl" />
              {/* Orbe derecha */}
              <div className="absolute -bottom-6 right-0 w-40 h-40 rounded-full bg-blue-600/25 blur-3xl" />
              {/* Grid lines sutil */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              {/* Puntos flotantes */}
              {[
                { top: "20%", left: "15%", animationDelay: "0s" },
                { top: "55%", left: "72%", animationDelay: "1.2s" },
                { top: "75%", left: "30%", animationDelay: "0.6s" },
                { top: "30%", left: "85%", animationDelay: "1.8s" },
              ].map((s, i) => <FloatingDot key={i} style={s} />)}

              {/* Icono central animado */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 18 }}
                  className="relative"
                >
                  {/* Anillo pulsante */}
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

            {/* ── Formulario ── */}
            <div className="px-5 pt-5 pb-6 space-y-3">

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-2.5 rounded-2xl text-sm font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Campo país */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.45 }}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
                  selectedCountry
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedCountry ? "bg-cyan-500/20" : "bg-white/5"
                }`}>
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
                    <option value="" disabled style={{ background: "#0c0c14", color: "#4b5563" }}>
                      Selecciona tu país
                    </option>
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
                  phoneNumber
                    ? "border-purple-500/50 bg-purple-500/5"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  phoneNumber ? "bg-purple-500/20" : "bg-white/5"
                }`}>
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
                      <div className="absolute top-full left-0 w-px h-full bg-white/10" />

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

                    {/* divisor vertical */}
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

              {/* Botón */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.45 }}
                onClick={handleSubmit}
                disabled={loading || !phoneNumber.trim() || !selectedCountry}
                className="relative w-full overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {/* fondo con shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 rounded-2xl" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                />
                <div className="relative flex items-center justify-center gap-2 py-4 text-white font-black text-sm tracking-wider">
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      SIGUIENTE
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </motion.button>

              <p className="text-center text-xs text-gray-700 pt-1">
                Necesario para completar tu registro en Buzzy
              </p>
            </div>
          </motion.div>
        )}

        {/* ══════════════ STEP 2: BIENVENIDA ══════════════ */}
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
            {/* ── Banda superior ── */}
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

            {/* Features */}
            <div className="px-5 pt-4 pb-6 space-y-3">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="text-sm text-gray-500 text-center pb-1 leading-relaxed"
              >
                Tu perfil está listo. Descubre contenido, conecta con creadores y comparte tus momentos.
              </motion.p>

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

              {/* Botón */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.45 }}
                onClick={onComplete}
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

      </AnimatePresence>
    </div>
  );
};

export default WelcomeOnboardingModal;
