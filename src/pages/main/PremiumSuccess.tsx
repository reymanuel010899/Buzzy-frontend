import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { apiClient } from '../../redux/client/api-client';
import { SUCCEES_LOGIN } from '../../redux/type';

const PremiumSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const currentUser = useSelector((state: any) => state.LoginReducer?.user);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const activate = async () => {
            try {
                // 1. Activate immediately via session_id (works even if webhook is delayed)
                let isPremium = false;
                if (sessionId) {
                    try {
                        const verifyRes = await apiClient.get(`/api/premium/verify/?session_id=${sessionId}`);
                        if (verifyRes.data.is_premium) isPremium = true;
                    } catch { /* webhook may have already activated it, continue to poll */ }
                }

                // 2. If verify didn't confirm, poll status (webhook already fired in prod)
                if (!isPremium) {
                    for (let i = 0; i < 8; i++) {
                        const res = await apiClient.get('/api/premium/status/');
                        if (res.data.is_premium) { isPremium = true; break; }
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }

                if (isPremium) {
                    // Update redux + localStorage so the UI reflects Premium immediately
                    const updatedUser = { ...currentUser, is_buzzy_premium: true };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    dispatch({
                        type: SUCCEES_LOGIN,
                        payload: {
                            access: localStorage.getItem('accessToken'),
                            refresh: localStorage.getItem('refreshToken'),
                            user: updatedUser,
                        },
                    });
                    setStatus('success');
                    // Redirect to profile after 2.5s
                    setTimeout(() => {
                        navigate(`/profile/${currentUser?.username || ''}`);
                    }, 2500);
                } else {
                    // Payment done but webhook not yet fired — still show success
                    // user will see Premium once they reload
                    setStatus('success');
                    setTimeout(() => {
                        navigate(`/profile/${currentUser?.username || ''}`);
                    }, 2500);
                }
            } catch {
                setErrorMsg('Hubo un problema al verificar tu pago. Si fue cobrado, tu Premium se activará en minutos.');
                setStatus('error');
                setTimeout(() => navigate('/'), 4000);
            }
        };

        activate();
    }, []);

    return (
        <div className="fixed inset-0 bg-[#050718] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 text-center max-w-xs"
            >
                {status === 'loading' && (
                    <>
                        <Loader2 size={48} className="text-[#7000ff] animate-spin" />
                        <p className="text-white/60 text-sm">Activando tu Premium...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="relative"
                        >
                            <div className="absolute inset-0 rounded-full bg-[#7000ff] blur-2xl opacity-30 scale-150" />
                            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#7000ff] to-[#00f0ff] flex items-center justify-center">
                                <span className="text-4xl">✦</span>
                            </div>
                        </motion.div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-black text-white">¡Bienvenido a Premium!</h1>
                            <p className="text-white/50 text-sm leading-relaxed">
                                Tu cuenta ya tiene acceso a todos los beneficios Buzzy Premium.
                            </p>
                        </div>

                        <div className="w-full space-y-2 text-left">
                            {[
                                { icon: '🚫', text: 'Sin anuncios en el feed' },
                                { icon: '🎬', text: 'Videos hasta 5 minutos' },
                                { icon: '🎁', text: 'Regalos exclusivos' },
                                { icon: '👑', text: 'Recibe regalos Premium' },
                            ].map(b => (
                                <div key={b.text} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5">
                                    <span>{b.icon}</span>
                                    <span className="text-sm text-white/80">{b.text}</span>
                                    <CheckCircle2 size={14} className="text-emerald-400 ml-auto" />
                                </div>
                            ))}
                        </div>

                        <p className="text-white/30 text-xs">Redirigiendo a tu perfil...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle size={48} className="text-amber-400" />
                        <p className="text-white/70 text-sm">{errorMsg}</p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default PremiumSuccess;
