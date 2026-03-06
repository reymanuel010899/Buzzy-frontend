import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Zap, Crown, Check, ArrowRight, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

interface SubscriptionPlan {
    id: number;
    name: string;
    description: string;
    price: string | number;
}

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    plans: SubscriptionPlan[];
    onSelectPlan: (planId: number) => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, plans, onSelectPlan }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    React.useEffect(() => {
        if (isOpen && plans.length > 1) {
            setCurrentIndex(1);
        } else if (isOpen) {
            setCurrentIndex(0);
        }
    }, [isOpen, plans.length]);

    const getPlanDetails = (name: string) => {
        switch (name.toUpperCase()) {
            case 'VIP':
                return {
                    icon: <Crown className="text-amber-400" size={32} />,
                    color: 'from-amber-400/20 to-amber-600/10',
                    borderColor: 'border-amber-500/30',
                    shadowColor: 'shadow-amber-500/20',
                    textColor: 'text-amber-400',
                    perks: [
                        'Borde Dorado en Comentarios',
                        '30 Comentarios Especiales al mes',
                        'Contenido Detrás de Cámaras',
                        'Regalos Exclusivos'
                    ]
                };
            case 'PLUS':
                return {
                    icon: <Zap className="text-blue-400" size={32} />,
                    color: 'from-blue-400/20 to-blue-600/10',
                    borderColor: 'border-blue-500/30',
                    shadowColor: 'shadow-blue-500/20',
                    textColor: 'text-blue-400',
                    perks: [
                        '3 Llamadas Mensuales Obligatorias',
                        'Borde Azul en Comentarios',
                        'Todas las ventajas VIP',
                        'Prioridad en el Feed'
                    ]
                };
            case 'FRIEND':
                return {
                    icon: <Star className="text-fuchsia-400" size={32} />,
                    color: 'from-fuchsia-400/20 to-fuchsia-600/10',
                    borderColor: 'border-fuchsia-500/30',
                    shadowColor: 'shadow-fuchsia-500/20',
                    textColor: 'text-fuchsia-400',
                    perks: [
                        '10 Llamadas Mensuales Obligatorias',
                        'Todas las ventajas VIP + PLUS',
                        'Badge Especial de "Friend"',
                        'Soporte Prioritario'
                    ]
                };
            default:
                return {
                    icon: <ShieldCheck className="text-gray-400" size={32} />,
                    color: 'from-gray-400/20 to-gray-600/10',
                    borderColor: 'border-gray-500/30',
                    shadowColor: 'shadow-gray-500/20',
                    textColor: 'text-gray-400',
                    perks: ['Acceso Básico']
                };
        }
    };

    const nextSlide = () => {
        if (currentIndex < plans.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl z-10 flex flex-col"
                    >
                        {/* Decorative background orbs */}
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 z-20 group"
                        >
                            <X size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                        </button>

                        <div className="p-8 pb-12 w-full text-center">
                            <div className="mb-8">
                                <motion.span
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black tracking-[0.2em] text-purple-400 uppercase inline-block mb-3"
                                >
                                    Efectivo y VIP
                                </motion.span>
                                <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase leading-none mb-3">
                                    Planes de <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Suscripción</span>
                                </h2>
                                <p className="text-gray-400 text-xs font-medium tracking-tight">
                                    Eleva tu experiencia digital y apoya a creadores.
                                </p>
                            </div>

                            {/* Carousel Container */}
                            <div className="relative overflow-hidden px-2 py-4">
                                <motion.div
                                    className="flex cursor-grab active:cursor-grabbing"
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(_, info) => {
                                        const threshold = 50;
                                        if (info.offset.x < -threshold && currentIndex < plans.length - 1) {
                                            nextSlide();
                                        } else if (info.offset.x > threshold && currentIndex > 0) {
                                            prevSlide();
                                        }
                                    }}
                                    animate={{ x: `${-currentIndex * 100}%` }}
                                    transition={{ type: "spring", damping: 30, stiffness: 200 }}
                                >
                                    {plans.map((plan, idx) => {
                                        const details = getPlanDetails(plan.name);
                                        return (
                                            <div key={plan.id} className="w-full flex-shrink-0 px-2 min-h-[460px]">
                                                <motion.div
                                                    animate={{
                                                        scale: currentIndex === idx ? 1 : 0.9,
                                                        opacity: currentIndex === idx ? 1 : 0.4
                                                    }}
                                                    className={`h-full relative group bg-gradient-to-br ${details.color} ${details.borderColor} border rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-xl ${details.shadowColor}`}
                                                >
                                                    {plan.name === 'PLUS' && (
                                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-[8px] font-black text-white uppercase tracking-widest shadow-xl">
                                                            Recomendado
                                                        </div>
                                                    )}

                                                    <div className="mb-6 p-4 bg-black/40 rounded-3xl border border-white/5 shadow-2xl">
                                                        {details.icon}
                                                    </div>

                                                    <h3 className={`text-xl font-black italic uppercase tracking-widest mb-2 ${details.textColor}`}>
                                                        {plan.name}
                                                    </h3>

                                                    <div className="flex items-baseline gap-1 mb-8">
                                                        <span className="text-3xl font-black text-white">${plan.price}</span>
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">/ Mes</span>
                                                    </div>

                                                    <ul className="w-full space-y-3 mb-10 text-left">
                                                        {details.perks.map((perk, pIdx) => (
                                                            <li key={pIdx} className="flex items-center gap-3 text-[10px] font-medium text-gray-300">
                                                                <div className={`flex-shrink-0 w-4 h-4 rounded-full bg-white/5 border ${details.borderColor} flex items-center justify-center`}>
                                                                    <Check size={8} className={details.textColor} strokeWidth={4} />
                                                                </div>
                                                                {perk}
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => onSelectPlan(plan.id)}
                                                        className={`mt-auto w-full py-4 px-6 rounded-2xl bg-white text-black font-black italic uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors shadow-xl`}
                                                    >
                                                        Suscribirme <ArrowRight size={14} strokeWidth={3} />
                                                    </motion.button>
                                                </motion.div>
                                            </div>
                                        );
                                    })}
                                </motion.div>

                                {/* Navigation Arrows */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none">
                                    <button
                                        onClick={prevSlide}
                                        disabled={currentIndex === 0}
                                        className={`pointer-events-auto p-2 rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md transition-all ${currentIndex === 0 ? 'opacity-0 scale-50' : 'opacity-100 scale-100 hover:bg-black/60'}`}
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={nextSlide}
                                        disabled={currentIndex === plans.length - 1}
                                        className={`pointer-events-auto p-2 rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md transition-all ${currentIndex === plans.length - 1 ? 'opacity-0 scale-50' : 'opacity-100 scale-100 hover:bg-black/60'}`}
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Pagination Indicators */}
                            <div className="flex justify-center gap-2 mt-8">
                                {plans.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-8 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                                    />
                                ))}
                            </div>

                            <div className="mt-8 text-center text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em]">
                                Pagos protegidos por <span className="text-blue-500">Stripe Secure Checkout</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SubscriptionModal;
