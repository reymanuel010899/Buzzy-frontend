import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Crown, Zap, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { GiftI } from '../../interfaces/gift';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../redux/client/api-client';

// Muestra el emoji inmediatamente y lo reemplaza con el video cuando ya cargó,
// evitando el flash negro en Android WebView.
const GiftVideo: React.FC<{ src: string; emoji: string }> = ({ src, emoji }) => {
    const [ready, setReady] = useState(false);
    return (
        <div className="w-full h-full relative">
            {/* Emoji visible hasta que el video esté listo */}
            <span
                className="absolute inset-0 flex items-center justify-center text-4xl md:text-6xl transition-opacity duration-200"
                style={{ opacity: ready ? 0 : 1 }}
            >
                {emoji}
            </span>
            <video
                src={src}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onCanPlayThrough={() => setReady(true)}
                className="w-full h-full object-cover rounded-full transition-opacity duration-200"
                style={{ opacity: ready ? 1 : 0 }}
            />
        </div>
    );
};

// --- Types ---

interface VipGiftExperienceProps {
    onClose: () => void;
    onSendGift: (gift: GiftI | any) => void;
    onBuyTokens?: () => void;
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
        {/* Base dark gradient — sin blur, sin animaciones */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a18] via-[#080810] to-[#04040c]" />
        {/* Líneas de grid sutiles */}
        <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
                backgroundImage: 'linear-gradient(#7c3aed 1px, transparent 1px), linear-gradient(90deg, #7c3aed 1px, transparent 1px)',
                backgroundSize: '40px 40px',
            }}
        />
        {/* Acento superior izquierdo — gradiente simple sin blur */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-purple-600/8" />
        {/* Acento inferior derecho */}
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-indigo-600/8" />
    </div>
);

const Header: React.FC<{ onClose: () => void; title: string }> = ({ onClose, title }) => (
    <div
        className="absolute left-0 right-0 flex justify-between items-center z-50 px-4"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
    >
        <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                <Star size={20} className="text-white fill-white" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-200 uppercase drop-shadow-xl">
                {title}
            </h1>
        </div>
        <button
            onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
            className="p-3 bg-white/10 rounded-full border border-white/20 active:scale-90 transition-all"
            style={{ touchAction: 'manipulation', minWidth: 48, minHeight: 48 }}
        >
            <X size={22} className="text-white" />
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
        <div className="relative w-full max-w-5xl flex justify-center items-center h-40 md:h-56 mt-4 md:mt-12 mb-4 md:mb-8 z-10 select-none">
            <button onClick={prevGift} className="absolute left-0 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-all z-20">
                <ChevronLeft size={40} className="text-white/30 hover:text-white" />
            </button>

            <div className="flex items-center justify-center gap-4 md:gap-10 w-full overflow-hidden px-10 py-6 md:py-15">
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
                                        <GiftVideo src={getMediaUrl(gift.video)} emoji={gift.emoji} />
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
                            <span className={`mt-2 md:mt-5 text-[10px] font-bold uppercase tracking-[0.3em] ${isSelected ? theme.primaryColor : 'text-gray-500'
                                }`}>
                                {gift.name}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            <button onClick={nextGift} className="absolute right-0 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-all z-20">
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
    <div className="relative w-full max-w-2xl bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl md:rounded-[2rem] p-3.5 md:p-6 shadow-2xl z-10 mx-4">
        <h2 className="text-base md:text-2xl font-black text-center mb-3 md:mb-6 text-gray-100/90 tracking-[0.3em] md:tracking-[0.4em] uppercase drop-shadow-lg">
            Gift Presential
        </h2>

        <div className="space-y-3 md:space-y-4">
            <div className="relative bg-black/40 border-2 border-white/5 rounded-xl p-3 md:p-5 shadow-inner flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1.5 md:mb-2">Mensaje VIP Personalizado...</span>
                <textarea
                    value={message}
                    onChange={(e) => {
                        const words = e.target.value.trim() === '' ? [] : e.target.value.trim().split(/\s+/);
                        if (words.length <= 50) setMessage(e.target.value);
                    }}
                    placeholder="ESCRIBE AQUÍ TU DEDICATORIA DE PODER"
                    className={`w-full bg-transparent text-white font-bold placeholder:text-gray-600 focus:outline-none transition-all resize-none h-10 md:h-16 text-xs md:text-sm tracking-widest uppercase italic`}
                />
                <span className={`text-[9px] self-end mt-1 ${(message.trim() === '' ? 0 : message.trim().split(/\s+/).length) >= 50 ? 'text-red-400' : 'text-gray-600'}`}>
                    {message.trim() === '' ? 0 : message.trim().split(/\s+/).length}/50 palabras
                </span>
            </div>

            <div className="flex gap-3 md:gap-4">
                <div className="flex-1 flex flex-col justify-center items-center bg-black/30 rounded-xl border border-white/5 p-2.5 md:p-4 shadow-inner">
                    <span className="text-gray-500 uppercase text-[9px] font-black tracking-[0.2em] mb-1 md:mb-1.5 text-center">Costo de Regalo:</span>
                    <span className={`text-lg md:text-2xl font-black ${theme.tokenColor} drop-shadow-[0_0_10px_${theme.glowColor}] uppercase`}>
                        {cost} TOKENS
                    </span>
                </div>
                <div className="flex-1 flex flex-col justify-center items-center bg-white/5 rounded-xl border border-white/10 p-2.5 md:p-4 shadow-inner">
                    <div className="flex items-center gap-1.5 mb-1 md:mb-1.5">
                        <Zap size={12} className="text-cyan-400 fill-cyan-400" />
                        <span className="text-gray-400 uppercase text-[9px] font-black tracking-[0.2em]">Disponibles:</span>
                    </div>
                    <span className={`text-lg md:text-2xl font-black uppercase ${walletTokens >= cost ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>
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
    <div className="mt-2 md:mt-6 flex justify-center w-full">
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
                            <span className={`text-lg font-black italic ${theme.primaryColor}`}>1s</span>
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

// --- Main Component ---

const VipGiftExperience: React.FC<VipGiftExperienceProps> = ({ onClose, onSendGift, onBuyTokens, gifts: parentGifts, walletTokens, subscriptionStatus }) => {
    const [isPressing, setIsPressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const sentRef = React.useRef(false);
    const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const onCloseRef = React.useRef(onClose);
    onCloseRef.current = onClose;
    const [selectedIndex, setSelectedIndex] = useState(2);
    const [message, setMessage] = useState("");
    const { t } = useTranslation('videos');

    const theme = getPlanTheme(subscriptionStatus);

    const displayGifts = parentGifts && parentGifts.length > 0 ? parentGifts : [
        { id: '1', name: 'Tokens', token_price: 100, slug: '1', emoji: '🪙', video: null, is_active: true, created_at: '' },
        { id: '2', name: 'Tokens', token_price: 200, slug: '2', emoji: '💎', video: null, is_active: true, created_at: '' },
        { id: '3', name: 'Tokens', token_price: 500, slug: '3', emoji: '🦁', video: null, is_active: true, created_at: '', color: 'special' },
        { id: '4', name: 'Tokens', token_price: 300, slug: '4', emoji: '👑', video: null, is_active: true, created_at: '' },
        { id: '5', name: 'Tokens', token_price: 150, slug: '5', emoji: '✨', video: null, is_active: true, created_at: '' },
    ];

    const selectedGift = displayGifts[selectedIndex] || displayGifts[0];
    const selectedGiftRef = React.useRef(selectedGift);
    selectedGiftRef.current = selectedGift;
    const messageRef = React.useRef(message);
    messageRef.current = message;
    const onSendGiftRef = React.useRef(onSendGift);
    onSendGiftRef.current = onSendGift;

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const startPress = () => {
        if (sentRef.current) return;
        setIsPressing(true);
        setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setProgress(prev => {
                const next = Math.min(prev + 1, 100);
                if (next >= 100) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    if (!sentRef.current) {
                        sentRef.current = true;
                        onSendGiftRef.current({ ...selectedGiftRef.current, vip_message: messageRef.current });
                        setTimeout(() => onCloseRef.current(), 100);
                    }
                }
                return next;
            });
        }, 10);
    };

    const stopPress = () => {
        setIsPressing(false);
        setProgress(0);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };


    const needsTokens = walletTokens < (selectedGift.token_price || 0);

    return (
        <div className="fixed inset-0 z-[100] bg-[#020408] text-white font-sans overflow-y-auto overflow-x-hidden flex flex-col items-center p-4 pt-20 pb-8">
            <SpaceBackground />
            <Header onClose={onClose} title={t('videos:giftExperience.specialGiftsTitle' as any)} />

            <div className="flex flex-col items-center w-full max-w-2xl z-10 my-auto">
                <GiftCarousel
                    displayGifts={displayGifts}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    theme={theme}
                />

                <div className="w-full flex flex-col items-center gap-3">
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
                        onPressStart={startPress}
                        onPressEnd={stopPress}
                        theme={theme}
                    />

                    {/* Buy Tokens — chip discreto en el flujo normal, debajo del
                        botón de enviar regalo. Antes era absolute bottom-0 y tapaba
                        el VipPowerButton en pantallas pequeñas. */}
                    {needsTokens && onBuyTokens && (
                        <motion.button
                            initial={{ y: 12, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onBuyTokens}
                            className="group relative flex items-center gap-2 rounded-full bg-white/5 backdrop-blur-md border px-5 py-2.5 shadow-inner transition-colors hover:bg-white/10"
                            style={{
                                borderColor: theme.glowColor,
                                boxShadow: `0 0 16px ${theme.glowColor}`,
                            }}
                        >
                            <Zap size={14} className={`${theme.primaryColor} fill-current`} />
                            <span className="text-white/90 font-black uppercase tracking-[0.2em] text-xs">
                                Comprar Tokens
                            </span>
                            <span className="bg-white/10 text-white/90 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                +💎
                            </span>
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VipGiftExperience;
