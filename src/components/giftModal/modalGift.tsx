import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Zap, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { GiftI } from '../../interfaces/gift';
import { useTranslation } from 'react-i18next';

// --- Types ---

interface VipGiftExperienceProps {
    onClose: () => void;
    onSendGift: (gift: GiftI | any) => void;
    gifts?: GiftI[] | any[];
    walletTokens: number;
    subscriptionStatus?: {
        is_active: boolean;
        plan?: {
            name: string;
        } | string;
        plan_name?: string;
    } | null;
}

interface GiftPanelLabels {
    giftPresential: string;
    vipMessageLabel: string;
    vipMessagePlaceholder: string;
    giftCost: string;
    available: string;
    tokensLabel: string;
}

interface SuccessOverlayLabels {
    title: string;
    subtitle: string;
    newBalance: string;
    button: string;
}

// --- Sub-components ---

const getPlanTheme = (subscriptionStatus: VipGiftExperienceProps['subscriptionStatus']) => {
    const plan = (subscriptionStatus?.plan_name || (typeof subscriptionStatus?.plan === 'string' ? subscriptionStatus?.plan : subscriptionStatus?.plan?.name) || 'NONE').toUpperCase();

    switch (plan) {
        case 'VIP':
            return {
                name: 'VIP',
                primaryColor: 'text-amber-400',
                glowColor: 'rgba(251,191,36,0.3)',
                borderColor: 'border-amber-400',
                bgGradient: 'from-amber-700 via-amber-600 to-amber-800',
                buttonBorder: 'border-amber-400/20',
                tokenColor: 'text-amber-500',
                icon: <Crown className="text-amber-400" size={36} />
            };
        case 'PLUS':
            return {
                name: 'PLUS',
                primaryColor: 'text-purple-400',
                glowColor: 'rgba(168,85,247,0.3)',
                borderColor: 'border-purple-400',
                bgGradient: 'from-purple-700 via-purple-600 to-purple-800',
                buttonBorder: 'border-purple-400/20',
                tokenColor: 'text-purple-500',
                icon: <Zap className="text-purple-400" size={36} />
            };
        case 'FRIEND':
            return {
                name: 'FRIEND',
                primaryColor: 'text-cyan-400',
                glowColor: 'rgba(0,240,255,0.3)',
                borderColor: 'border-cyan-400',
                bgGradient: 'from-cyan-700 via-cyan-600 to-cyan-800',
                buttonBorder: 'border-cyan-400/20',
                tokenColor: 'text-cyan-500',
                icon: <Star className="text-cyan-400" size={36} />
            };
        default:
            return {
                name: 'DEFAULT',
                primaryColor: 'text-yellow-400',
                glowColor: 'rgba(234,179,8,0.3)',
                borderColor: 'border-yellow-400/80',
                bgGradient: 'from-yellow-700 via-yellow-600 to-yellow-800',
                buttonBorder: 'border-yellow-400/20',
                tokenColor: 'text-yellow-500',
                icon: <Crown className="text-yellow-400" size={36} />
            };
    }
};

const SpaceBackground: React.FC = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1a1d3a_0%,_#020408_100%)]" />
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
            <div
                key={i}
                className="absolute rounded-full bg-white animate-pulse"
                style={{
                    width: Math.random() * 2 + 'px',
                    height: Math.random() * 2 + 'px',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    opacity: Math.random(),
                    animationDelay: Math.random() * 5 + 's'
                }}
            />
        ))}
        {/* Nebula Glows */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-900/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-900/5 blur-[100px] rounded-full" />
    </div>
);

const Header: React.FC<{ onClose: () => void; title: string }> = ({ onClose, title }) => (
    <div className="absolute top-10 left-3 right-12 flex justify-between items-center z-10 w-full max-w-7xl px-4 md:px-8">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                <Star size={20} className="text-white fill-white" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-200 uppercase drop-shadow-xl">
                {title}
            </h1>
        </div>
        <button
            onClick={onClose}
            className="p-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 hover:scale-105 transition-all shadow-xl group"
        >
            <X size={20} className="text-gray-400 group-hover:text-white" />
        </button>
    </div>
);

const GiftCarousel: React.FC<{
    displayGifts: GiftI[];
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    theme: any;
}> = ({ displayGifts, selectedIndex, setSelectedIndex, theme }) => {
    const nextGift = () => setSelectedIndex((selectedIndex + 1) % displayGifts.length);
    const prevGift = () => setSelectedIndex((selectedIndex - 1 + displayGifts.length) % displayGifts.length);

    return (
        <div className="relative w-full max-w-5xl flex justify-center items-center h-56 mt-12 mb-8 z-10 select-none">
            <button onClick={prevGift} className="absolute left-4 md:left-16 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-all z-20">
                <ChevronLeft size={40} className="text-white/30 hover:text-white" />
            </button>

            <div className="flex items-center justify-center gap-4 md:gap-10 w-full overflow-hidden px-10 py-15">
                {displayGifts.map((gift, index) => {
                    const isSelected = index === selectedIndex;
                    const distance = Math.abs(index - selectedIndex);
                    const isVisible = distance <= 2;

                    if (!isVisible) return null;

                    return (
                        <motion.div
                            key={gift.id || gift.slug || index}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: 1 - distance * 0.35,
                                scale: isSelected ? 1.2 : 0.75,
                                x: (index - selectedIndex) * 35,
                                zIndex: 10 - distance
                            }}
                            className="relative flex flex-col items-center group cursor-pointer"
                            onClick={() => setSelectedIndex(index)}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="glow"
                                    className={`absolute -inset-6 rounded-full blur-2xl`}
                                    style={{ backgroundColor: theme.glowColor }}
                                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}

                            <div className={`relative rounded-full p-1.5 transition-all duration-500 ${isSelected
                                ? `border-2 ${theme.borderColor}`
                                : 'border border-white/10 opacity-60'
                                }`}
                                style={isSelected ? { boxShadow: `0 0 40px ${theme.glowColor}` } : {}}
                            >
                                <div className="w-20 h-20 md:w-28 md:h-28 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-sm relative overflow-hidden">
                                    {gift.video ? (
                                        <video
                                            src={gift.video}
                                            autoPlay
                                            loop
                                            muted
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    ) : (
                                        <span className="text-4xl md:text-6xl">{gift.emoji}</span>
                                    )}
                                </div>
                                {isSelected && (
                                    <div className="absolute -top-1/4 left-1/2 -translate-x-1/2">
                                        {React.cloneElement(theme.icon as React.ReactElement, {
                                            className: `${theme.primaryColor} drop-shadow-[0_0_10px_${theme.glowColor}]`
                                        })}
                                    </div>
                                )}
                            </div>
                            <span className={`mt-5 text-[10px] font-bold uppercase tracking-[0.3em] ${isSelected ? theme.primaryColor : 'text-gray-500'
                                }`}>
                                {gift.name}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            <button onClick={nextGift} className="absolute right-4 md:right-16 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-all z-20">
                <ChevronRight size={40} className="text-white/30 hover:text-white" />
            </button>
        </div>
    );
};

const GiftPanel: React.FC<{
    message: string;
    setMessage: (msg: string) => void;
    cost: number;
    walletTokens: number;
    theme: any;
}> = ({ message, setMessage, cost, walletTokens, theme }) => (
    <div className="relative w-full max-w-2xl bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] p-5 md:p-6 shadow-2xl z-10 mx-4">
        <h2 className="text-lg md:text-2xl font-black text-center mb-6 text-gray-100/90 tracking-[0.4em] uppercase drop-shadow-lg">
            Gift Presential
        </h2>

        <div className="space-y-4">
            <div className="relative bg-black/40 border-2 border-white/5 rounded-xl p-4 md:p-5 shadow-inner flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">Mensaje VIP Personalizado...</span>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="ESCRIBE AQUÍ TU DEDICATORIA DE PODER"
                    className={`w-full bg-transparent text-white font-bold placeholder:text-gray-600 focus:outline-none transition-all resize-none h-16 text-xs md:text-sm tracking-widest uppercase italic`}
                />
            </div>

            <div className="flex gap-4">
                <div className="flex-1 flex flex-col justify-center items-center bg-black/30 rounded-xl border border-white/5 p-4 shadow-inner">
                    <span className="text-gray-500 uppercase text-[9px] font-black tracking-[0.2em] mb-1.5 text-center">Costo de Regalo:</span>
                    <span className={`text-xl md:text-2xl font-black ${theme.tokenColor} drop-shadow-[0_0_10px_${theme.glowColor}] uppercase`}>
                        {cost} TOKENS
                    </span>
                </div>
                <div className="flex-1 flex flex-col justify-center items-center bg-white/5 rounded-xl border border-white/10 p-4 shadow-inner">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Zap size={12} className="text-cyan-400 fill-cyan-400" />
                        <span className="text-gray-400 uppercase text-[9px] font-black tracking-[0.2em]">Disponibles:</span>
                    </div>
                    <span className={`text-xl md:text-2xl font-black uppercase ${walletTokens >= cost ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>
                        {walletTokens} TOKENS
                    </span>
                </div>
            </div>
        </div>
    </div>
);

const VipPowerButton: React.FC<{
    progress: number;
    isPressing: boolean;
    onPressStart: () => void;
    onPressEnd: () => void;
    theme: any;
}> = ({ progress, isPressing, onPressStart, onPressEnd, theme }) => (
    <div className="mt-6 flex justify-center w-full">
        <button
            onMouseDown={onPressStart}
            onMouseUp={onPressEnd}
            onMouseLeave={onPressEnd}
            onTouchStart={onPressStart}
            onTouchEnd={onPressEnd}
            className="relative w-full max-w-md group cursor-pointer select-none active:scale-[0.98] transition-transform"
        >
            <div className={`relative bg-gradient-to-r ${theme.bgGradient} p-[1.5px] rounded-2xl overflow-hidden`} style={{ boxShadow: `0 0 30px ${theme.glowColor}` }}>
                <div className={`relative bg-[#080808] rounded-xl p-4 overflow-hidden border ${theme.buttonBorder}`}>
                    {/* Progress Fill Overlay */}
                    <motion.div
                        className={`absolute left-0 top-0 bottom-0 pointer-events-none opacity-20`}
                        style={{ width: `${progress}%`, backgroundColor: theme.glowColor }}
                    />

                    <div className="relative flex items-center justify-between gap-5">
                        {/* V Diamond Icon */}
                        <div className="relative flex-shrink-0">
                            <div className={`relative w-12 h-12 bg-[#1a1a1a] border-[3px] rounded-xl rotate-45 flex items-center justify-center overflow-hidden transition-all duration-300`}
                                style={{ borderColor: theme.primaryColor.replace('text-', ''), boxShadow: `0 0 12px ${theme.glowColor}` }}>
                                <span className={`text-2xl font-black -rotate-45 ${theme.primaryColor}`}>
                                    {theme.name === 'VIP' ? 'V' : theme.name === 'PLUS' ? 'P' : 'F'}
                                </span>
                            </div>
                            {isPressing && (
                                <motion.div
                                    className={`absolute -inset-1.5 border-2 rounded-xl rotate-45`}
                                    style={{ borderColor: theme.primaryColor.replace('text-', '') }}
                                    animate={{ scale: [1, 1.25], opacity: [0.4, 0] }}
                                    transition={{ duration: 0.6, repeat: Infinity }}
                                />
                            )}
                        </div>

                        {/* Text Context */}
                        <div className="flex-1 text-left flex flex-col justify-center">
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.primaryColor} opacity-70`}>Presiona para liberar</p>
                            <p className="text-base md:text-lg font-black uppercase text-white tracking-widest mt-0.5">{theme.powerText}</p>
                        </div>

                        {/* Time & Mini Progress */}
                        <div className="flex flex-col items-end justify-center min-w-[50px]">
                            <span className={`text-lg font-black italic ${theme.primaryColor}`}>2s</span>
                            <div className="w-12 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                <div
                                    className="h-full transition-all duration-75 ease-linear"
                                    style={{ width: `${progress}%`, backgroundColor: theme.glowColor }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Spark Particles */}
                    {isPressing && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-[1px] h-2.5 bg-white"
                                    animate={{
                                        x: [Math.random() * 300, Math.random() * 300],
                                        y: [0, 80],
                                        opacity: [0, 1, 0],
                                        rotate: 45
                                    }}
                                    transition={{ duration: 0.4, repeat: Infinity, delay: Math.random() }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </button>
    </div>
);

const SuccessOverlay: React.FC<{ onClose: () => void; theme: any }> = ({ onClose, theme }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-sm flex items-center justify-center p-6"
    >
        <div className="text-center">
            <div className="relative inline-block mb-6">
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 blur-2xl rounded-full"
                    style={{ backgroundColor: theme.primaryColor.replace('text-', '') }}
                />
                <Zap size={100} className="text-white relative z-10 fill-current drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black italic text-white tracking-tighter uppercase drop-shadow-xl">
                ENVÍO COMPLETADO
            </h2>
            <p className={`${theme.primaryColor} text-lg font-black tracking-[0.5em] mt-4 uppercase drop-shadow-md`}>
                Tu prestigio se eleva
            </p>

            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={`mt-12 px-10 py-3.5 bg-gradient-to-r ${theme.bgGradient} rounded-full font-black text-white tracking-[0.2em] shadow-xl transition-all uppercase border-2 shadow-inner text-xs`}
                style={{ borderColor: theme.primaryColor.replace('text-', '') }}
            >
                Volver al Nexo
            </motion.button>
        </div>
    </motion.div>
);

// --- Main Component ---

const VipGiftExperience: React.FC<VipGiftExperienceProps> = ({ onClose, onSendGift, gifts: parentGifts, walletTokens, subscriptionStatus }) => {
    const [isPressing, setIsPressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isSent, setIsSent] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(2);
    const [message, setMessage] = useState("");
    const { t } = useTranslation('videos');

    const theme = getPlanTheme(subscriptionStatus);
    const powerLabel = t('videos:giftExperience.powerLabel', { plan: theme.name });

    const displayGifts = parentGifts && parentGifts.length > 0 ? parentGifts : [
        { id: '1', name: 'Tokens', token_price: 100, slug: '1', emoji: '🪙', video: null, is_active: true, created_at: '' },
        { id: '2', name: 'Tokens', token_price: 200, slug: '2', emoji: '💎', video: null, is_active: true, created_at: '' },
        { id: '3', name: 'Tokens', token_price: 500, slug: '3', emoji: '🦁', video: null, is_active: true, created_at: '', color: 'special' },
        { id: '4', name: 'Tokens', token_price: 300, slug: '4', emoji: '👑', video: null, is_active: true, created_at: '' },
        { id: '5', name: 'Tokens', token_price: 150, slug: '5', emoji: '✨', video: null, is_active: true, created_at: '' },
    ];

    const selectedGift = displayGifts[selectedIndex] || displayGifts[0];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPressing && progress < 100) {
            interval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 1, 100));
            }, 20);
        } else if (progress >= 100) {
            handleComplete();
        } else if (!isPressing) {
            setProgress(0);
        }
        return () => clearInterval(interval);
    }, [isPressing, progress]);

    const handleComplete = () => {
        setIsSent(true);
        onSendGift(selectedGift);
        setIsPressing(false);
        // Automatically close the modal so animations can render
        setTimeout(onClose, 100);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#020408] text-white font-sans overflow-hidden flex flex-col items-center justify-center p-4">
            <SpaceBackground />
            <Header onClose={onClose} title={t('videos:giftExperience.specialGiftsTitle')} />

            <div className="flex flex-col items-center w-full max-w-2xl z-10 scale-[0.9] md:scale-100 transition-transform">
                <GiftCarousel
                    displayGifts={displayGifts}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    theme={theme}
                />

                <div className="w-full flex flex-col items-center gap-4">
                    <GiftPanel
                        message={message}
                        setMessage={setMessage}
                        cost={selectedGift.token_price || 0}
                        walletTokens={walletTokens}
                        theme={theme}
                    />

                    <VipPowerButton
                        progress={progress}
                        isPressing={isPressing}
                        onPressStart={() => setIsPressing(true)}
                        onPressEnd={() => setIsPressing(false)}
                        theme={theme}
                    />
                </div>
            </div>
        </div>
    );
};

export default VipGiftExperience;
