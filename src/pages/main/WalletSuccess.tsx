import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../redux/client/api-client';
import { useDispatch } from 'react-redux';
import { SUCCEES_GET_WALLET } from '../../redux/type';

const WalletSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const verifySession = async () => {
            if (!sessionId) {
                setLoading(false);
                return;
            }

            try {
                const response = await apiClient.get(`/api/wallet/verify-deposit-session/?session_id=${sessionId}`);
                setData(response.data);

                // Fetch updated wallet balance
                const walletResponse = await apiClient.get(`/api/get-wallet/`);
                if (walletResponse.status === 200) {
                    dispatch({
                        type: SUCCEES_GET_WALLET,
                        payload: walletResponse.data,
                    });
                }
            } catch (err: any) {
                console.error('Error verifying wallet deposit session:', err);
                setError('No pudimos verificar los detalles de tu recarga, pero tus fondos deberían estar disponibles pronto.');
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, [sessionId, dispatch]);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 overflow-hidden relative font-sans">
            {/* Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-600/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00f0ff]/10 blur-[120px] rounded-full" />

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
                            <p className="text-gray-400 font-medium">Verificando tu recarga...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                                className="w-24 h-24 bg-gradient-to-tr from-green-500 to-[#00f0ff] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]"
                            >
                                <CheckCircle2 className="text-white w-12 h-12" />
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-black text-white mb-4 tracking-tight uppercase"
                            >
                                RECARGA EXITOSA
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-gray-400 text-lg mb-8 leading-relaxed font-medium"
                            >
                                Has recargado ${data?.amount_total || '0.00'} con éxito. El saldo ya está disponible en tu Wallet.
                            </motion.p>

                            {error && (
                                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 text-left">
                                    <AlertCircle className="text-yellow-500 shrink-0" size={20} />
                                    <p className="text-xs text-yellow-200/80">{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/wallet')}
                                    className="w-full bg-gradient-to-r from-green-500 to-[#00f0ff] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 uppercase tracking-wider"
                                >
                                    Ir a mi Wallet <ArrowRight size={20} />
                                </motion.button>

                                {sessionId && (
                                    <p className="text-xs text-gray-500 font-medium">
                                        ID de Operación: <span className="text-gray-400 font-mono">{sessionId.substring(0, 12)}...</span>
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Decorative elements */}
                <div className="absolute top-10 right-10 text-[#00f0ff]/20 animate-pulse">
                    <Sparkles size={24} />
                </div>
                <div className="absolute bottom-10 left-10 text-green-500/20 animate-pulse delay-700">
                    <Sparkles size={20} />
                </div>
            </motion.div>
        </div>
    );
};

export default WalletSuccess;
