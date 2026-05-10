import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ShoppingCart, Star, CreditCard, Sparkles } from 'lucide-react';

interface TokenOption {
    id: number;
    tokens: number;
    price: string | number;
    cost?: number;
    popular?: boolean;
    is_popular?: boolean;
    color_gradient: string;
}

interface TokenShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurchase: (tokens: number, cost: number) => void;
}

import { useDispatch } from 'react-redux';
import { getTokenPackages } from '../../redux/actions/buyTokens';
import { apiClient } from '../../redux/client/api-client';

const TokenShopModal: React.FC<TokenShopModalProps> = ({ isOpen, onClose, onPurchase }) => {
    const dispatch = useDispatch();
    const [packages, setPackages] = React.useState<TokenOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [customTokenAmount, setCustomTokenAmount] = React.useState<number | ''>('');
    const [customTokenPrice, setCustomTokenPrice] = React.useState<number | null>(null);
    const [calculatingPrice, setCalculatingPrice] = React.useState<boolean>(false);

    React.useEffect(() => {
        if (isOpen) {
            setLoading(true);
            dispatch(getTokenPackages() as any)
                .then((data: TokenOption[]) => {
                    setPackages(data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [isOpen, dispatch]);

    React.useEffect(() => {
        if (!customTokenAmount || customTokenAmount <= 0) {
            setCustomTokenPrice(null);
            setCalculatingPrice(false);
            return;
        }

        setCalculatingPrice(true);
        const delayDebounceFn = setTimeout(() => {
            apiClient.get(`/api/wallet/calculate-token-price/?tokens=${customTokenAmount}`)
                .then(response => {
                    if (response.data && response.data.total_price !== undefined) {
                        setCustomTokenPrice(response.data.total_price);
                    }
                })
                .catch(err => {
                    console.error("Error calculating token price", err);
                    setCustomTokenPrice(null);
                })
                .finally(() => {
                    setCalculatingPrice(false);
                });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [customTokenAmount]);
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pt-15 pb-15">
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
                        className="relative w-full max-w-xl bg-[#0a0a0f] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl z-10 p-4 md:p-6"
                    >
                        {/* Animated Background effects */}
                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/20 blur-[80px] rounded-full" />
                            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="relative z-10 flex justify-between items-center mb-4 md:mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                                    <Star className="text-yellow-500 fill-yellow-500" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-black italic tracking-tighter text-white uppercase leading-none">
                                        Recargar Tokens
                                    </h2>
                                    <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mt-0.5">
                                        Eleva tu Prestigio VIP
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10"
                            >
                                <X size={18} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                            {loading ? (
                                <div className="col-span-full flex justify-center py-10">
                                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : packages.length > 0 ? (
                                <>
                                    {packages.map((option) => (
                                        <motion.button
                                            key={option.id}
                                            whileHover={{ scale: 1.02, translateY: -3 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => onPurchase(option.tokens, Number(option.price))}
                                            className={`relative group p-2.5 md:p-3 rounded-[1.2rem] text-left border overflow-hidden transition-all duration-300 ${option.is_popular
                                                ? 'bg-gradient-to-br from-purple-900/40 to-black border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            {option.is_popular && (
                                                <div className="absolute top-3 right-3 bg-purple-500 text-[8px] font-black italic px-2 py-0.5 rounded-full text-white uppercase tracking-widest animate-pulse">
                                                    Popular
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={`p-2 rounded-xl bg-gradient-to-br ${option.color_gradient} shadow-lg`}>
                                                    <Zap className="text-white fill-white" size={16} />
                                                </div>
                                                <div>
                                                    <span className="text-xl md:text-2xl font-black italic text-white tracking-tighter">
                                                        {option.tokens}
                                                    </span>
                                                    <span className="ml-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                        Tokens
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end mt-2">
                                                <div>
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Precio Total</p>
                                                    <p className="text-base md:text-lg font-black text-white">${option.price}</p>
                                                </div>
                                                <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 transition-all">
                                                    <ShoppingCart size={14} className="text-white" />
                                                </div>
                                            </div>

                                            {/* Decorative Sparkle */}
                                            <div className="absolute -bottom-4 -right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Sparkles className="text-white/10" size={40} />
                                            </div>
                                        </motion.button>
                                    ))}

                                    {/* Custom Amount Option */}
                                    <div className="relative group p-2.5 md:p-3 rounded-[1.2rem] text-left border overflow-hidden transition-all duration-300 bg-white/[0.03] border-white/10 hover:border-white/20 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={`p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg`}>
                                                    <Zap className="text-white fill-white" size={16} />
                                                </div>
                                                <div>
                                                    <span className="text-sm md:text-base font-black italic text-white tracking-tighter uppercase leading-tight">
                                                        Cantidad <br /> Personalizada
                                                    </span>
                                                </div>
                                            </div>

                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Ej. 10000"
                                                value={customTokenAmount === '' ? '' : customTokenAmount}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setCustomTokenAmount(val === '' ? '' : Number(val));
                                                }}
                                                className="w-full bg-black/40 text-white font-bold p-2 text-sm mt-1 rounded-lg border border-white/10 focus:outline-none focus:border-purple-500 transition-all text-center"
                                            />
                                        </div>

                                        <div className="flex justify-between items-end mt-2">
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Precio Total</p>
                                                <p className="text-base md:text-lg font-black text-white">
                                                    {calculatingPrice ? (
                                                        <span className="inline-block w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></span>
                                                    ) : (
                                                        `$${customTokenPrice !== null ? customTokenPrice.toFixed(2) : "0.00"}`
                                                    )}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (customTokenAmount && Number(customTokenAmount) > 0 && customTokenPrice !== null) {
                                                        onPurchase(Number(customTokenAmount), customTokenPrice);
                                                    }
                                                }}
                                                disabled={!customTokenAmount || Number(customTokenAmount) <= 0 || calculatingPrice || customTokenPrice === null}
                                                className="p-1.5 bg-purple-600 rounded-lg hover:bg-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ShoppingCart size={14} className="text-white" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="col-span-full text-center text-gray-500 py-10 uppercase font-bold tracking-widest text-xs">
                                    No hay paquetes disponibles
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="relative z-10 mt-4 md:mt-6 pt-3 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 text-center md:text-left">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                    <CreditCard size={14} className="text-blue-400" />
                                </div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                    Pago seguro con Tarjeta o Crypto
                                </p>
                            </div>
                            <p className="text-[8px] font-medium text-gray-600 italic">
                                *Tokens acreditados al instante.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TokenShopModal;
