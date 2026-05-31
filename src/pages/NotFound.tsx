import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-[#050718] flex items-center justify-center overflow-hidden relative">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-purple-600/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 200 }}
        className="relative flex flex-col items-center gap-6 text-center px-8 max-w-sm"
      >
        {/* Big number with gradient */}
        <div className="relative">
          <span
            className="text-[120px] font-black leading-none select-none"
            style={{
              background: "linear-gradient(135deg, #7000ff 0%, #00f0ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 40px rgba(112,0,255,0.4))",
            }}
          >
            404
          </span>
          {/* Glow under number */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-purple-500/30 blur-xl rounded-full" />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2">
          <h2 className="text-white font-bold text-xl tracking-tight">Contenido no encontrado</h2>
          <p className="text-white/40 text-sm leading-relaxed">
            Este contenido ya no existe o fue eliminado.
          </p>
        </div>

        {/* Divider line */}
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm text-white"
            style={{
              background: "linear-gradient(135deg, #7000ff, #00f0ff)",
              boxShadow: "0 0 24px rgba(112,0,255,0.35)",
            }}
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
