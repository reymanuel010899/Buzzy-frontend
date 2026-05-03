import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import { FetchWithAuthProps } from "../../redux/actions/Login";
import { login, googleLogin } from "../../redux/actions/Login";
import { useDispatch } from 'react-redux';
import { auth } from "../../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { ForgotPasswordModal } from "../../components/auth/ForgotPasswordModal";

const SignIn: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState<FetchWithAuthProps>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { email, password } = data;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((prevState: FetchWithAuthProps) => ({ ...prevState, [e.target.name]: e.target.value }));
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setLoading(true);
        try {
          // @ts-ignore
          await googleLogin(token)(dispatch);
          navigate('/');
        } catch (apiError: any) {
          const status = apiError?.response?.status;
          const code   = apiError?.response?.data?.error;
          if (status === 409 && code === 'not_registered') {
            setErrorMsg("No tienes una cuenta en Buzzy con ese correo de Google. Regístrate primero.");
          } else {
            setErrorMsg("Error al iniciar sesión con Google. Intenta de nuevo.");
          }
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Google Sign-In Error", error);
      setErrorMsg("Error al iniciar sesión con Google");
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    login(data)(dispatch).then(() => {
      setLoading(false);
      navigate('/');
    }).catch((err) => {
      setLoading(false);
      const backError = err?.response?.data?.detail || err?.response?.data?.error;
      setErrorMsg(backError || "Correo o contraseña incorrectos");
    });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#0b0f19] py-12 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#131b2c]/80 backdrop-blur-2xl shadow-2xl border border-white/10 rounded-[2.5rem] p-8 sm:p-10 max-w-md w-full relative z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-tight">
            Bienvenido de vuelta
          </h2>
          <p className="text-sm text-gray-400 mt-2 font-medium">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center font-bold">
            {errorMsg}
          </div>
        )}

        <div className="space-y-5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-[#1e2738] border border-white/10 hover:bg-[#252f43] text-white font-bold py-3.5 rounded-xl transition-all shadow-sm"
          >
            <FcGoogle className="w-5 h-5" />
            Continuar con Google
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">O con correo</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Email */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-500 transition-colors w-5 h-5" />
              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={onChange}
                className="w-full pl-12 pr-4 py-3.5 bg-[#0b0f19] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white font-medium transition-all"
                required
              />
            </div>

            {/* Campo Contraseña */}
            <div className="relative group z-0">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-500 transition-colors w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                name="password"
                value={password}
                onChange={onChange}
                className="w-full pl-12 pr-12 py-3.5 bg-[#0b0f19] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white font-medium transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-500 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="text-right mt-2 text-gray-400">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm font-bold text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 disabled:opacity-50 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Ingresar
            </button>
          </form>
        </div>

        {/* Enlaces Adicionales */}
        <div className="text-center mt-8 text-gray-400 font-medium">
          ¿No tienes cuenta?{" "}
          <Link to={'/sign-up'} className="text-cyan-500 hover:text-cyan-400 font-bold ml-1 transition-colors">
            Regístrate
          </Link>
        </div>
      </motion.div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </div>
  );
};

export default SignIn;
