import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clapperboard, ImageIcon, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { verifyAICheckout, type CheckoutVerifyResult } from '../../services/aiService';

const AiCreditsSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CheckoutVerifyResult | null>(null);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    verifyAICheckout(sessionId)
      .then(setData)
      .catch(() => setError('No pudimos verificar el pago, pero tus créditos serán acreditados pronto.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#050505' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(251,191,36,0.15) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(249,115,22,0.12) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl relative z-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as React.CSSProperties}
      >
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
            <p className="text-gray-400 font-medium">Verificando tu pago...</p>
          </div>
        ) : error ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <AlertCircle className="w-14 h-14 text-yellow-400" />
            <h2 className="text-white font-bold text-xl">Pago recibido</h2>
            <p className="text-gray-400 text-sm">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold"
            >
              Ir al inicio
            </button>
          </div>
        ) : data?.paid ? (
          <div className="flex flex-col items-center gap-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 0 30px rgba(245,158,11,0.4)' }}
            >
              <CheckCircle2 size={40} className="text-white" />
            </motion.div>

            <div>
              <h2 className="text-white font-bold text-2xl">¡Créditos añadidos!</h2>
              <p className="text-gray-400 text-sm mt-1">Tu pago fue procesado exitosamente</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl border border-cyan-500/20 text-center" style={{ backgroundColor: 'rgba(6,182,212,0.1)' }}>
                <Clapperboard size={18} className="text-cyan-400 mx-auto mb-1.5" />
                <span className="text-white font-bold text-2xl">{data.video_credits}</span>
                <p className="text-cyan-400 text-[10px] mt-0.5">Videos disponibles</p>
              </div>
              <div className="p-4 rounded-2xl border border-pink-500/20 text-center" style={{ backgroundColor: 'rgba(236,72,153,0.1)' }}>
                <ImageIcon size={18} className="text-pink-400 mx-auto mb-1.5" />
                <span className="text-white font-bold text-2xl">{data.image_credits}</span>
                <p className="text-pink-400 text-[10px] mt-0.5">Imágenes disponibles</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <Sparkles size={12} className="text-amber-400" />
              <span className="text-gray-400 text-xs">+{data.videos_added} videos · +{data.images_added} imágenes añadidos</span>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg"
              style={{ background: 'linear-gradient(to right, #f59e0b, #f97316)', boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}
            >
              ¡A crear contenido!
            </button>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-4">
            <AlertCircle className="w-14 h-14 text-red-400" />
            <h2 className="text-white font-bold text-xl">Pago no completado</h2>
            <p className="text-gray-400 text-sm">El pago no fue procesado. No se realizó ningún cargo.</p>
            <button onClick={() => navigate('/')} className="mt-4 w-full py-3.5 rounded-2xl bg-white/10 text-white font-bold">
              Volver al inicio
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AiCreditsSuccess;
