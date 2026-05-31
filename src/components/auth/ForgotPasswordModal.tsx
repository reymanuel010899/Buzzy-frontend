import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Key, Check, Loader2, X, ArrowLeft } from "lucide-react";
import { apiClient } from "../../redux/client/api-client";

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = "EMAIL" | "CODE" | "PASSWORD" | "SUCCESS";

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<Step>("EMAIL");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSendCode = async () => {
        if (!email) return setError("Ingresa tu correo");
        setLoading(true);
        setError("");
        try {
            await apiClient.post("/api/auth/forgot-password/", { email });
            setStep("CODE");
        } catch (err: any) {
            setError(err?.response?.data?.error || "Error al enviar el código");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!code) return setError("Ingresa el código");
        setLoading(true);
        setError("");
        try {
            await apiClient.post("/api/auth/verify-code/", { email, code });
            setStep("PASSWORD");
        } catch (err: any) {
            setError(err?.response?.data?.error || "Código inválido");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (password !== confirmPassword) return setError("Las contraseñas no coinciden");
        if (password.length < 8) return setError("Mínimo 8 caracteres");

        // Check strictness as requested
        if (!/[A-Z]/.test(password) || !/[!@#$&*.,_+\-]/.test(password)) {
            return setError("Incluye una mayúscula y un carácter especial");
        }

        setLoading(true);
        setError("");
        try {
            await apiClient.post("/api/auth/reset-password/", { email, code, password, confirm_password: confirmPassword });
            setStep("SUCCESS");
            setTimeout(() => {
                onClose();
                reset();
            }, 3000);
        } catch (err: any) {
            setError(err?.response?.data?.error || "Error al restablecer la contraseña");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep("EMAIL");
        setEmail("");
        setCode("");
        setPassword("");
        setConfirmPassword("");
        setError("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-[#131b2c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/10"
            >
                {/* Header Decor */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />

                <button onClick={() => { onClose(); reset(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {step === "EMAIL" && (
                            <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="flex justify-center mb-6">
                                    <div className="p-4 bg-cyan-500/10 rounded-2xl">
                                        <Mail className="w-8 h-8 text-cyan-400" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white text-center mb-2">Restablecer contraseña</h3>
                                <p className="text-gray-400 text-center text-sm mb-8">Ingresa tu correo para recibir un código de recuperación.</p>

                                <div className="relative group mb-6">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors w-5 h-5" />
                                    <input
                                        type="email"
                                        placeholder="Tu correo electrónico"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-[#0b0f19] border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white transition-all"
                                    />
                                </div>

                                {error && <p className="text-red-400 text-xs font-bold mb-4 text-center">{error}</p>}

                                <button
                                    onClick={handleSendCode}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="animate-spin w-5 h-5" />}
                                    Enviar código
                                </button>
                            </motion.div>
                        )}

                        {step === "CODE" && (
                            <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <button onClick={() => setStep("EMAIL")} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm font-bold">
                                    <ArrowLeft size={16} /> Volver
                                </button>
                                <div className="flex justify-center mb-6">
                                    <div className="p-4 bg-yellow-500/10 rounded-2xl">
                                        <Key className="w-8 h-8 text-yellow-400" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white text-center mb-2">Verificar código</h3>
                                <p className="text-gray-400 text-center text-sm mb-8">Hemos enviado un código de 6 dígitos a <span className="text-cyan-400 font-bold">{email}</span></p>

                                <div className="relative group mb-6">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="Código de 6 dígitos"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-[#0b0f19] border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white text-center tracking-[12px] font-black transition-all"
                                    />
                                </div>

                                {error && <p className="text-red-400 text-xs font-bold mb-4 text-center">{error}</p>}

                                <button
                                    onClick={handleVerifyCode}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="animate-spin w-5 h-5" />}
                                    Verificar código
                                </button>
                            </motion.div>
                        )}

                        {step === "PASSWORD" && (
                            <motion.div key="pass" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="flex justify-center mb-6">
                                    <div className="p-4 bg-green-500/10 rounded-2xl">
                                        <Lock className="w-8 h-8 text-green-400" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white text-center mb-2">Nueva contraseña</h3>
                                <p className="text-gray-400 text-center text-sm mb-8">El código es correcto. Ahora crea tu nueva contraseña.</p>

                                <div className="space-y-4 mb-6">
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors w-5 h-5" />
                                        <input
                                            type="password"
                                            placeholder="Nueva contraseña"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-[#0b0f19] border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white transition-all"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors w-5 h-5" />
                                        <input
                                            type="password"
                                            placeholder="Confirmar nueva contraseña"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-[#0b0f19] border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white transition-all"
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-red-400 text-xs font-bold mb-4 text-center">{error}</p>}

                                <button
                                    onClick={handleResetPassword}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="animate-spin w-5 h-5" />}
                                    Guardar contraseña
                                </button>
                            </motion.div>
                        )}

                        {step === "SUCCESS" && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                                        <Check className="w-10 h-10 text-green-400" />
                                    </motion.div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h3>
                                <p className="text-gray-400">Tu contraseña ha sido actualizada con éxito. Redirigiendo al inicio de sesión...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
