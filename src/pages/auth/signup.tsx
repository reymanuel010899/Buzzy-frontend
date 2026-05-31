import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Globe } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { IDataSignUp } from "../../components/auth/auth.interface";
import { register } from "../../redux/actions/register";
import { useDispatch } from 'react-redux';
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { googleRegister } from "../../redux/actions/Login";

// ─── All countries with ISO-2 code ───────────────────────────────────────────
const COUNTRIES = [
  { name: "Afghanistan", code: "AF" }, { name: "Albania", code: "AL" },
  { name: "Algeria", code: "DZ" }, { name: "Andorra", code: "AD" },
  { name: "Angola", code: "AO" }, { name: "Argentina", code: "AR" },
  { name: "Armenia", code: "AM" }, { name: "Australia", code: "AU" },
  { name: "Austria", code: "AT" }, { name: "Azerbaijan", code: "AZ" },
  { name: "Bahamas", code: "BS" }, { name: "Bahrain", code: "BH" },
  { name: "Bangladesh", code: "BD" }, { name: "Belarus", code: "BY" },
  { name: "Belgium", code: "BE" }, { name: "Belize", code: "BZ" },
  { name: "Benin", code: "BJ" }, { name: "Bolivia", code: "BO" },
  { name: "Bosnia and Herzegovina", code: "BA" }, { name: "Botswana", code: "BW" },
  { name: "Brazil", code: "BR" }, { name: "Brunei", code: "BN" },
  { name: "Bulgaria", code: "BG" }, { name: "Burkina Faso", code: "BF" },
  { name: "Cambodia", code: "KH" }, { name: "Cameroon", code: "CM" },
  { name: "Canada", code: "CA" }, { name: "Chile", code: "CL" },
  { name: "China", code: "CN" }, { name: "Colombia", code: "CO" },
  { name: "Costa Rica", code: "CR" }, { name: "Croatia", code: "HR" },
  { name: "Cuba", code: "CU" }, { name: "Cyprus", code: "CY" },
  { name: "Czech Republic", code: "CZ" }, { name: "Denmark", code: "DK" },
  { name: "Dominican Republic", code: "DO" }, { name: "Ecuador", code: "EC" },
  { name: "Egypt", code: "EG" }, { name: "El Salvador", code: "SV" },
  { name: "Estonia", code: "EE" }, { name: "Ethiopia", code: "ET" },
  { name: "Finland", code: "FI" }, { name: "France", code: "FR" },
  { name: "Georgia", code: "GE" }, { name: "Germany", code: "DE" },
  { name: "Ghana", code: "GH" }, { name: "Greece", code: "GR" },
  { name: "Guatemala", code: "GT" }, { name: "Haiti", code: "HT" },
  { name: "Honduras", code: "HN" }, { name: "Hungary", code: "HU" },
  { name: "Iceland", code: "IS" }, { name: "India", code: "IN" },
  { name: "Indonesia", code: "ID" }, { name: "Iran", code: "IR" },
  { name: "Iraq", code: "IQ" }, { name: "Ireland", code: "IE" },
  { name: "Israel", code: "IL" }, { name: "Italy", code: "IT" },
  { name: "Jamaica", code: "JM" }, { name: "Japan", code: "JP" },
  { name: "Jordan", code: "JO" }, { name: "Kazakhstan", code: "KZ" },
  { name: "Kenya", code: "KE" }, { name: "Kuwait", code: "KW" },
  { name: "Latvia", code: "LV" }, { name: "Lebanon", code: "LB" },
  { name: "Libya", code: "LY" }, { name: "Lithuania", code: "LT" },
  { name: "Luxembourg", code: "LU" }, { name: "Malaysia", code: "MY" },
  { name: "Maldives", code: "MV" }, { name: "Mali", code: "ML" },
  { name: "Malta", code: "MT" }, { name: "Mexico", code: "MX" },
  { name: "Moldova", code: "MD" }, { name: "Monaco", code: "MC" },
  { name: "Mongolia", code: "MN" }, { name: "Montenegro", code: "ME" },
  { name: "Morocco", code: "MA" }, { name: "Mozambique", code: "MZ" },
  { name: "Myanmar", code: "MM" }, { name: "Namibia", code: "NA" },
  { name: "Nepal", code: "NP" }, { name: "Netherlands", code: "NL" },
  { name: "New Zealand", code: "NZ" }, { name: "Nicaragua", code: "NI" },
  { name: "Nigeria", code: "NG" }, { name: "North Korea", code: "KP" },
  { name: "Norway", code: "NO" }, { name: "Oman", code: "OM" },
  { name: "Pakistan", code: "PK" }, { name: "Panama", code: "PA" },
  { name: "Paraguay", code: "PY" }, { name: "Peru", code: "PE" },
  { name: "Philippines", code: "PH" }, { name: "Poland", code: "PL" },
  { name: "Portugal", code: "PT" }, { name: "Puerto Rico", code: "PR" },
  { name: "Qatar", code: "QA" }, { name: "Romania", code: "RO" },
  { name: "Russia", code: "RU" }, { name: "Rwanda", code: "RW" },
  { name: "Saudi Arabia", code: "SA" }, { name: "Senegal", code: "SN" },
  { name: "Serbia", code: "RS" }, { name: "Singapore", code: "SG" },
  { name: "Slovakia", code: "SK" }, { name: "Slovenia", code: "SI" },
  { name: "Somalia", code: "SO" }, { name: "South Africa", code: "ZA" },
  { name: "South Korea", code: "KR" }, { name: "Spain", code: "ES" },
  { name: "Sri Lanka", code: "LK" }, { name: "Sudan", code: "SD" },
  { name: "Sweden", code: "SE" }, { name: "Switzerland", code: "CH" },
  { name: "Syria", code: "SY" }, { name: "Taiwan", code: "TW" },
  { name: "Tanzania", code: "TZ" }, { name: "Thailand", code: "TH" },
  { name: "Tunisia", code: "TN" }, { name: "Turkey", code: "TR" },
  { name: "Uganda", code: "UG" }, { name: "Ukraine", code: "UA" },
  { name: "United Arab Emirates", code: "AE" }, { name: "United Kingdom", code: "GB" },
  { name: "United States", code: "US" }, { name: "Uruguay", code: "UY" },
  { name: "Uzbekistan", code: "UZ" }, { name: "Venezuela", code: "VE" },
  { name: "Vietnam", code: "VN" }, { name: "Yemen", code: "YE" },
  { name: "Zambia", code: "ZM" }, { name: "Zimbabwe", code: "ZW" },
].sort((a, b) => a.name.localeCompare(b.name));

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState<IDataSignUp>({
    name: "",
    username: "",
    email: "",
    password: "",
    repeat_password: "",
    country: "",
    country_code: "",
    referral_code: "",
  });

  // Leer el código de referido de la URL (?code=TOKEN) y pre-cargarlo
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setFormData(prev => ({ ...prev, referral_code: code }));
    }
  }, [searchParams]);

  const { name, username, email, password, repeat_password, country } = formData;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = e.currentTarget.dataset.field || e.target.name;
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = COUNTRIES.find(c => c.code === e.target.value);
    if (selected) {
      setFormData(prev => ({ ...prev, country: selected.name, country_code: selected.code }));
    }
  };

  // ─── Google Sign-In ───────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await GoogleAuth.initialize({
        clientId: '993295175092-6l5q4g5u401ieunl4pjp7lqj5psjpunj.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      const googleUser = await GoogleAuth.signIn();
      const token = googleUser.authentication.accessToken;
      const photoUrl = googleUser.imageUrl ?? undefined;

      if (token) {
        const lang = navigator.language || "es-US";
        const detectedCode = lang.split('-')[1]?.toUpperCase() || "US";
        const detectedCountry = COUNTRIES.find(c => c.code === detectedCode) || { name: "United States", code: "US" };

        const sendCode = formData.country_code || detectedCountry.code;
        const sendName = formData.country || detectedCountry.name;

        await googleRegister(token, photoUrl, sendCode, sendName, formData.referral_code || undefined)(dispatch);
        navigate('/');
      }
    } catch (error: any) {
      if (error?.error !== 'popup_closed_by_user') {
        console.error("Google Sign-Up Error", error);
        const backendError = error?.response?.data?.message || error?.response?.data?.error;
        setErrorMsg(backendError || "Error al crear la cuenta con Google. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };
  const isUsernameValid = /^[a-zA-Z0-9._-]+$/.test(username);
  const isUsernameLengthValid = username.length >= 3;

  const isLengthValid = password.length >= 8;
  const isUppercaseValid = /[A-Z]/.test(password);
  const isSpecialValid = /[!@#$&*.,_+\-]/.test(password);
  const isPasswordValid = isLengthValid && isUppercaseValid && isSpecialValid;

  // ─── Normal Register ──────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== repeat_password) {
      setErrorMsg("Las contraseñas no coinciden");
      return;
    }
    if (!isUsernameLengthValid || !isUsernameValid) {
      setErrorMsg("El username debe tener mínimo 3 caracteres y solo puede contener letras, números, puntos, guiones y guiones bajos.");
      return;
    }
    if (!formData.country_code) {
      setErrorMsg("Selecciona tu país");
      return;
    }
    if (!isPasswordValid) {
      setErrorMsg("La contraseña no cumple con los requisitos mínimos de seguridad.");
      return;
    }

    setLoading(true);
    try {
      await register(formData)(dispatch);

      localStorage.removeItem('refreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');

      setSuccessMsg("¡Cuenta creada con éxito! Revisa tu correo para verificarla.");
      setTimeout(() => navigate('/sign-in'), 2500);
    } catch (err: any) {
      console.error(err);
      const backError = err?.response?.data?.error;
      setErrorMsg(backError || "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#0b0f19] py-12 px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#131b2c]/80 backdrop-blur-2xl shadow-2xl border border-white/10 rounded-[2.5rem] p-8 sm:p-10 max-w-md w-full relative z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-tight">Crea tu cuenta</h2>
          <p className="text-sm text-gray-400 mt-2 font-medium">Únete y descubre todo el contenido.</p>
        </div>

        {successMsg && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm text-center font-bold">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center font-bold">
            {errorMsg}
          </div>
        )}

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[#1e2738] border border-white/10 hover:bg-[#252f43] text-white font-bold py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50 mb-5"
        >
          <FcGoogle className="w-5 h-5" />
          Registrarse con Google
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">O con correo</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">

          {/* Nombre */}
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-500 transition-colors w-5 h-5" />
            <input
              type="text" name="signup_name" data-field="name" placeholder="Nombre completo" autoComplete="off"
              value={name} onChange={onChange} required
              className="w-full pl-12 pr-4 py-3.5 bg-[#0b0f19] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white font-medium transition-all"
            />
          </div>

          {/* Username */}
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-500 transition-colors w-5 h-5" />
            <input
              type="text" name="signup_username" data-field="username" placeholder="Usuario (Username)" autoComplete="off"
              value={username} onChange={onChange} required
              className="w-full pl-12 pr-4 py-3.5 bg-[#0b0f19] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white font-medium transition-all"
            />
          </div>

          {username.length > 0 && (
            <div className="grid grid-cols-2 gap-2 px-1">
              {[
                { valid: isUsernameLengthValid, label: "Mín. 3 chars" },
                { valid: isUsernameValid, label: "Sin espacios ni @" },
              ].map(({ valid, label }) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all duration-200 ${
                    valid
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-white/[0.03] border-white/10 text-gray-600"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${valid ? "bg-green-400" : "bg-gray-700"}`} />
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Email */}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-500 transition-colors w-5 h-5" />
            <input
              type="email" name="signup_email" data-field="email" placeholder="Correo electrónico" autoComplete="off"
              value={email} onChange={onChange} required
              className="w-full pl-12 pr-4 py-3.5 bg-[#0b0f19] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white font-medium transition-all"
            />
          </div>

          {/* Country */}
          <div className="relative group">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-500 transition-colors w-5 h-5 pointer-events-none z-10" />
            <select
              value={formData.country_code}
              onChange={handleCountryChange}
              required
              autoComplete="off"
              className="w-full pl-12 pr-4 py-3.5 bg-[#0b0f19] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white font-medium transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-gray-500">Selecciona tu país *</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code} className="bg-[#131b2c] text-white">
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          {country && (
            <p className="text-[11px] text-cyan-500 font-bold px-2 uppercase tracking-wide">
              País seleccionado: {country}
            </p>
          )}

          {/* Contraseña */}
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-500 transition-colors w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              name="signup_password" data-field="password" placeholder="Contraseña" autoComplete="new-password"
              value={password} onChange={onChange} required
              className="w-full pl-12 pr-12 py-3.5 bg-[#0b0f19] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white font-medium transition-all"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-500 transition-colors">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Password Strength Hints */}
          {password.length > 0 && (
            <div className="grid grid-cols-3 gap-2 px-1">
              {[
                { valid: isLengthValid, label: "8+ chars" },
                { valid: isUppercaseValid, label: "Mayúscula" },
                { valid: isSpecialValid, label: "Especial" },
              ].map(({ valid, label }) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all duration-200 ${
                    valid
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-white/[0.03] border-white/10 text-gray-600"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${valid ? "bg-green-400" : "bg-gray-700"}`} />
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Confirmar Contraseña */}
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-500 transition-colors w-5 h-5" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="signup_repeat_password" data-field="repeat_password" placeholder="Confirmar contraseña" autoComplete="new-password"
              value={repeat_password} onChange={onChange} required
              className="w-full pl-12 pr-12 py-3.5 bg-[#0b0f19] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white font-medium transition-all"
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-500 transition-colors">
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 disabled:opacity-50 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Crear Cuenta
          </button>

          <div className="text-center mt-4 text-gray-400 font-medium">
            ¿Ya tienes una cuenta?{" "}
            <Link to="/sign-in" className="text-cyan-500 hover:text-cyan-400 font-bold ml-1 transition-colors">
              Iniciar sesión
            </Link>
          </div>

        </form>
      </motion.div>
    </div>
  );
};

export default SignUp;
