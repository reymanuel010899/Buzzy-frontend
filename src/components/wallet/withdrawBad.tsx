import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, LifeBuoy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WithdrawCancelProps {
    isOpen: boolean;
    onClose: () => void;
    message: string
}

const WithdrawCancel: React.FC<WithdrawCancelProps> = ({ isOpen, onClose, message }) => {
    const navigate = useNavigate();
    const { t } = useTranslation('wallet');

    // 🔹 Si no está abierto, no renderiza nada
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">

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
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/30"
                >
                    <XCircle className="text-red-500 w-12 h-12" />
                </motion.div>

                <h1 className="text-3xl font-black text-white mb-4">
                    {t('withdrawFailure.title')}
                </h1>

                <p className="text-gray-400 text-lg mb-8">
                    {message}
                </p>

                <div className="space-y-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            onClose();
                            navigate('/wallet');
                        }}
                        className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border border-white/10"
                    >
                        <ArrowLeft size={20} /> {t('withdrawFailure.ctaBack')}
                    </motion.button>

                    <button
                        onClick={() => navigate('/support')}
                        className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-white text-sm font-medium"
                    >
                        <LifeBuoy size={16} /> {t('withdrawFailure.contactSupport')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WithdrawCancel;
