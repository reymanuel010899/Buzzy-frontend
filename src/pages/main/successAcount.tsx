import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles, Loader2, AlertCircle, Clock } from 'lucide-react';
import { apiClient } from '../../redux/client/api-client';

const AccountSuccess: React.FC = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPendingModal, setShowPendingModal] = useState(false);

    useEffect(() => {
        const verifySession = async () => {
            try {
                const res = await apiClient.get(`/api/wallet/account-status/`);
                console.log(res.data);

                if (!res.data.active) {
                    
                    setShowPendingModal(true);
                }

            } catch (err: any) {
                console.error(err);
                setError('No pudimos verificar el estado de tu cuenta.');
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, []);

    return (
<div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 overflow-hidden relative font-sans">

    {/* Background */}
    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-600/20 blur-[120px] rounded-full" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00f0ff]/10 blur-[120px] rounded-full" />

    {/* SOLO SE MUESTRA SI NO ESTA PENDING */}
    {!showPendingModal && (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl relative z-10"
        >
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-12 flex flex-col items-center"
                    >
                        <Loader2 className="w-12 h-12 text-[#00f0ff] animate-spin mb-4" />
                        <p className="text-gray-400 font-medium">Verificando tu cuenta...</p>
                    </motion.div>
                ) : (
                    <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 12, stiffness: 200 }}
                            className="w-24 h-24 bg-gradient-to-tr from-green-500 to-[#00f0ff] rounded-full flex items-center justify-center mx-auto mb-8"
                        >
                            <CheckCircle2 className="text-white w-12 h-12" />
                        </motion.div>

                        <h4 className="text-3xl font-black text-white mb-4 uppercase">
                           éxito
                        </h4>

                        <p className="text-gray-400 text-lg mb-8">
                            Tu cuenta bancaria fue agregada correctamente. Ahora podrás recibir pagos y retirar tus ganancias.
                        </p>

                        {error && (
                            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3">
                                <AlertCircle className="text-yellow-500 shrink-0" size={20} />
                                <p className="text-xs text-yellow-200/80">{error}</p>
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/wallet')}
                            className="w-full bg-gradient-to-r from-green-500 to-[#00f0ff] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2"
                        >
                            Ir a mi Wallet <ArrowRight size={15} />
                        </motion.button>

                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )}

    {/* MODAL PENDING */}
    <AnimatePresence>
        {showPendingModal && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center"
                >
                    <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="text-yellow-400" size={32} />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3">
                        Cuenta en revisión
                    </h3>

                    <p className="text-gray-400 mb-6">
                        Tu cuenta está siendo verificada. Esto puede tardar hasta 
                        <span className="text-white font-semibold"> 1 hora</span>.
                    </p>

                    <button
                        onClick={() => navigate("/wallet")}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-semibold"
                    >
                        Volver al Wallet
                    </button>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>

</div>
);

};

export default AccountSuccess;
