import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, LifeBuoy } from 'lucide-react';

const WalletCancel: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-600/5 blur-[120px] rounded-full" />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl relative z-10"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                    className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]"
                >
                    <XCircle className="text-red-500 w-12 h-12" />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-black text-white mb-4 tracking-tight"
                >
                    RECARGA CANCELADA
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-400 text-lg mb-8 leading-relaxed font-medium"
                >
                    Has cancelado el proceso de recarga. No se ha realizado ningún cargo y tu balance actual se mantiene intacto.
                </motion.p>

                <div className="space-y-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/wallet')}
                        className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border border-white/10 transition-colors"
                    >
                        <ArrowLeft size={20} /> Volver a mi Wallet
                    </motion.button>

                    <button
                        onClick={() => navigate('/support')}
                        className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-medium"
                    >
                        <LifeBuoy size={16} /> ¿Necesitas ayuda? Contacta a soporte
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WalletCancel;
