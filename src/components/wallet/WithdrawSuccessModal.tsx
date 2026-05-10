import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WithdrawSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WithdrawSuccessModal: React.FC<WithdrawSuccessModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation('wallet');
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        className="relative w-full max-w-sm bg-[#0a0a0f] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl z-10 text-center p-8"
                    >
                        {/* Background Orbs */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-600/10 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 z-20 group"
                        >
                            <X size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                        </button>

                        <div className="flex flex-col items-center mt-4">
                            {/* Animated Success Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.1 }}
                                className="w-24 h-24 mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 relative"
                            >
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                                <Check size={48} className="text-emerald-400 relative z-10" />
                            </motion.div>

                            <h3 className="text-2xl font-black italic text-white tracking-tighter uppercase mb-2">
                                {t('withdrawSuccess.title')}
                            </h3>

                            <p className="text-sm text-gray-400 mb-8 px-4">
                                {t('withdrawSuccess.description')}
                            </p>

                                <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black italic uppercase tracking-[0.2em] text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                >
                                {t('withdrawSuccess.cta')}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default WithdrawSuccessModal;
