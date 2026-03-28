import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, Volume2, VolumeX } from "lucide-react";
import axios from "axios";
import { getBaseUrl } from "../../redux/client/api-client";

interface AdOverlayProps {
    ad: any;
    onClose: (finished?: boolean, duration?: number) => void;
    isMuted: boolean;
    toggleMute: () => void;
    isVisible?: boolean; // New prop to track visibility in feed
}

const AdOverlay: React.FC<AdOverlayProps> = ({ ad, onClose, isMuted, toggleMute, isVisible = true }) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSkippable, setIsSkippable] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const creative = ad?.creative;
    const mediaFile = creative?.media_file;
    const destinationUrl = creative?.destination_url;
    const title = creative?.title || "Publicidad";
    const hasValidAd = Boolean(ad?.id && mediaFile);

    const isImage = typeof mediaFile === "string" && /\.(jpeg|jpg|gif|png|webp|svg|avif)$/i.test(mediaFile);
    const mediaSrc = typeof mediaFile === "string"
        ? (mediaFile.startsWith("http") ? mediaFile : `${getBaseUrl()}media/${mediaFile}`)
        : "";

    useEffect(() => {
        if (!hasValidAd) {
            onClose(false);
        }
    }, [hasValidAd, onClose]);

    // Unified effect for play/unmute/image timer
    useEffect(() => {
        if (!hasValidAd) {
            return;
        }

        if (isImage) {
            setDuration(5);
            return;
        }

        // 1. Handle Unmute (User wants it unmuted on start)
        if (isMuted && isVisible) {
            toggleMute();
        }

        // 2. Aggressive Play
        const playVideo = async () => {
            if (videoRef.current) {
                try {
                    await videoRef.current.play();
                } catch (error) {
                    console.log("Autoplay blocked or interrupted:", error);
                }
            }
        };

        const timeoutId = setTimeout(playVideo, 100);
        return () => clearTimeout(timeoutId);
    }, [ad?.id, hasValidAd, isVisible, isImage, isMuted, toggleMute]);

    const skipTime = Math.floor(duration / 6) || 5; // Default to 5s if duration is unknown yet

    useEffect(() => {
        if (currentTime >= skipTime) {
            setIsSkippable(true);
        }
    }, [currentTime, skipTime]);

    useEffect(() => {
        if (!hasValidAd) {
            return;
        }

        timerRef.current = setInterval(() => {
            if (isImage) {
                setCurrentTime(prev => {
                    if (prev >= 5) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        onClose(true, 5);
                        return prev;
                    }
                    return prev + 1;
                });
            } else if (videoRef.current && !videoRef.current.paused) {
                setCurrentTime(prev => prev + 1);
            }
        }, 1000);

        // Track impression
        trackImpression();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [hasValidAd, isImage, onClose]);

    const trackImpression = async () => {
        if (!ad?.id) {
            return;
        }

        try {
            const token = localStorage.getItem("accessToken");
            await axios.post(`${getBaseUrl()}api/ads/campaigns/${ad.id}/track_impression/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Error tracking impression:", error);
        }
    };

    const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        setDuration(e.currentTarget.duration);
    };

    const handleVideoEnded = () => {
        onClose(true, duration);
    };

    if (!hasValidAd) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[40] flex flex-col items-center justify-center overflow-hidden group"
        >
            {/* No more dark background overlays */}

            {/* Top Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-20">
                <motion.div
                    className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]"
                    initial={{ width: "0%" }}
                    animate={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
                    transition={{ ease: "linear" }}
                />
            </div>

            {/* Ad Media */}
            {isImage ? (
                <img
                    src={mediaSrc}
                    className="w-full h-full object-cover"
                    alt={title}
                />
            ) : (
                <video
                    ref={videoRef}
                    src={mediaSrc}
                    autoPlay
                    muted={isMuted || !isVisible}
                    onLoadedMetadata={handleVideoMetadata}
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-cover"
                    onClick={toggleMute}
                />
            )}

            {/* Header Area (Floating & Transparent) */}
            <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 bg-cyan-500 rounded-full text-[10px] font-black text-black uppercase tracking-tighter shadow-lg pointer-events-auto">
                        Ad
                    </div>
                    <p className="text-[11px] font-bold text-white drop-shadow-lg truncate max-w-[150px]">
                        {title}
                    </p>
                </div>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="h-9 w-9 flex items-center justify-center rounded-full text-white drop-shadow-lg pointer-events-auto"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                    }}
                >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </motion.button>
            </div>

            {/* Bottom Controls Area (Floating & Transparent) */}
            <div className="absolute bottom-3 left-8 right-8 flex items-end justify-between z-10 pointer-events-none">
                {/* Visit Website CTA */}
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (destinationUrl) {
                            window.open(destinationUrl, '_blank');
                        }
                    }}
                    disabled={!destinationUrl}
                    className="pointer-events-auto px-6 py-3 bg-white text-black rounded-full text-[11px] font-black uppercase tracking-wider shadow-2xl flex items-center gap-2 group transition-transform"
                >
                    Visitar sitio
                    <SkipForward className="w-3.5 h-3.5 rotate-180 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>

                {/* Skip Logic Area */}
                <div className="flex flex-col items-end">
                    <AnimatePresence mode="wait">
                        {!isSkippable ? (
                            <motion.div
                                key="countdown"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-white text-[11px] font-black drop-shadow-lg uppercase tracking-widest px-4 py-2"
                            >
                                Saltar en {Math.max(0, skipTime - currentTime)}s
                            </motion.div>
                        ) : (
                            <motion.button
                                key="skip-btn"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose(false);
                                }}
                                className="pointer-events-auto text-white text-[11px] font-black flex items-center gap-2 transition-all drop-shadow-xl uppercase py-2"
                            >
                                Saltar anuncio
                                <SkipForward className="w-4 h-4" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default AdOverlay;
