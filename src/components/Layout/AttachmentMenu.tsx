import { AnimatePresence, motion } from "framer-motion";
import {
  FileText, Image as ImageIcon, Camera, Headphones,
  User, BarChart2, Calendar, Smile
} from "lucide-react"

export const AttachmentMenu = ({ isOpen }: { isOpen: boolean }) => {
  const options = [
    { icon: <FileText className="text-purple-500" size={20} />, label: "Documento" },
    { icon: <ImageIcon className="text-blue-500" size={20} />, label: "Fotos y videos" },
    { icon: <Camera className="text-pink-500" size={20} />, label: "Cámara" },
    { icon: <Headphones className="text-orange-500" size={20} />, label: "Audio" },
    { icon: <User className="text-cyan-500" size={20} />, label: "Contacto" },
    { icon: <BarChart2 className="text-yellow-500" size={20} />, label: "Encuesta" },
    { icon: <Calendar className="text-rose-500" size={20} />, label: "Evento" },
    { icon: <Smile className="text-emerald-500" size={20} />, label: "Nuevo sticker" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
          className="absolute bottom-20 left-4 w-64 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60]"
        >
          <div className="py-2">
            {options.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                className="w-full flex items-center gap-4 px-4 py-3 text-gray-200 transition-colors"
                onClick={() => console.log(opt.label)}
              >
                <div className="flex-shrink-0">{opt.icon}</div>
                <span className="text-[15px] font-medium">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};