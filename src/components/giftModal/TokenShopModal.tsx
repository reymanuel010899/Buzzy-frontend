import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ShoppingCart, Star, CreditCard, Sparkles } from 'lucide-react';

interface TokenOption {
    id: string;
    tokens: number;
    price: string;
    cost: number;
    popular?: boolean;
    color: string;
}

const tokenOptions: TokenOption[] = [
    { id: '1', tokens: 100, price: '$1.50', cost: 1.50, color: 'from-blue-500 to-cyan-500' },
    { id: '2', tokens: 200, price: '$2.90', cost: 2.90, color: 'from-purple-500 to-pink-500', popular: true },
    { id: '3', tokens: 500, price: '$4.50', cost: 4.50, color: 'from-amber-400 to-orange-600' },
    { id: '4', tokens: 1000, price: '$8.00', cost: 8.00, color: 'from-yellow-400 to-yellow-600' },
];

interface TokenShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurchase: (tokens: number, cost: number) => void;
}

const TokenShopModal: React.FC<TokenShopModalProps> = ({ isOpen, onClose, onPurchase }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl z-10 p-6 md:p-10"
                    >
                        {/* Animated Background effects */}
                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/20 blur-[80px] rounded-full" />
                            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="relative z-10 flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/30">
                                    <Star className="text-yellow-500 fill-yellow-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
                                        Recargar Tokens
                                    </h2>
                                    <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mt-1">
                                        Eleva tu Prestigio VIP
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tokenOptions.map((option) => (
                                <motion.button
                                    key={option.id}
                                    whileHover={{ scale: 1.02, translateY: -5 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onPurchase(option.tokens, option.cost)}
                                    className={`relative group p-6 rounded-[1.8rem] text-left border overflow-hidden transition-all duration-300 ${option.popular
                                        ? 'bg-gradient-to-br from-purple-900/40 to-black border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {option.popular && (
                                        <div className="absolute top-4 right-4 bg-purple-500 text-[10px] font-black italic px-3 py-1 rounded-full text-white uppercase tracking-widest animate-pulse">
                                            Popular
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mb-3">
                                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${option.color} shadow-lg`}>
                                            <Zap className="text-white fill-white" size={22} />
                                        </div>
                                        <div>
                                            <span className="text-3xl font-black italic text-white tracking-tighter">
                                                {option.tokens}
                                            </span>
                                            <span className="ml-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                Tokens
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Precio Total</p>
                                            <p className="text-xl font-black text-white">{option.price}</p>
                                        </div>
                                        <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all">
                                            <ShoppingCart size={18} className="text-white" />
                                        </div>
                                    </div>

                                    {/* Decorative Sparkle */}
                                    <div className="absolute -bottom-4 -right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Sparkles className="text-white/10" size={60} />
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="relative z-10 mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <CreditCard size={16} className="text-blue-400" />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Pago seguro con Tarjeta o Crypto
                                </p>
                            </div>
                            <p className="text-[9px] font-medium text-gray-600 italic">
                                *Los tokens se acreditan instantáneamente tras la compra.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TokenShopModal;
