import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Zap } from 'lucide-react';

interface TokenPurchaseSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchasedAmount: number;
    newTotalBalance: number;
}

const TokenPurchaseSuccessModal: React.FC<TokenPurchaseSuccessModalProps> = ({ isOpen, onClose, purchasedAmount, newTotalBalance }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-[320px] bg-[#0d0d12] border border-green-500/20 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] z-10 p-8 text-center"
                    >
                        {/* Premium green glow at the top */}
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-green-600/10 to-transparent pointer-events-none" />

                        {/* Ornamental background circles */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-green-600/10 blur-3xl rounded-full" />
                        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-600/10 blur-3xl rounded-full" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 z-20"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center justify-center pt-2">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="p-4 bg-transparent rounded-3xl border border-green-500/30 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.2)] relative group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/10 rounded-3xl blur-md group-hover:blur-lg transition-all" />
                                <CheckCircle className="text-green-400 relative z-10" size={32} strokeWidth={2} />
                            </motion.div>

                            <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-tight mb-2">
                                ¡Compra Exitosa!
                            </h2>
                            <p className="text-[13px] font-medium text-gray-400 mb-6 leading-relaxed max-w-[240px]">
                                Has adquirido <span className="text-white font-bold">{purchasedAmount} Tokens</span> correctamente. ¡Disfruta tu poder VIP!
                            </p>

                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                    Nuevo Balance Disponible
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="p-1.5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg">
                                        <Zap className="text-white fill-white" size={14} />
                                    </div>
                                    <span className="text-2xl font-black italic tracking-tighter text-white">
                                        {newTotalBalance}
                                    </span>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{
                                    scale: 1.05,
                                    translateY: -2,
                                    boxShadow: "0 20px 40px -10px rgba(16,185,129,0.5)"
                                }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="w-full relative group py-4 px-6 rounded-full bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] bg-[length:200%_auto] hover:bg-right transition-all duration-500 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-white/20"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center justify-center gap-3">
                                    <span className="text-white font-black italic tracking-widest uppercase text-[11px]">
                                        Continuar
                                    </span>
                                </div>

                                {/* Animated shine effect */}
                                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 opacity-40 group-hover:animate-shine" />
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TokenPurchaseSuccessModal;
