import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Rocket, ExternalLink, UserPlus, UserCheck } from "lucide-react";
import axios from "axios";
import { getBaseUrl } from "../../redux/client/api-client";
import { createFollower } from "../../redux/actions/createFollower";
import { tapHaptic, ImpactStyle } from "../../utils/haptics";

interface AdCardProps {
    ad: any;
    isVisible: boolean;
    isMuted: boolean;
    toggleMute: () => void;
}

const AdCard: React.FC<AdCardProps> = ({ ad, isVisible, isMuted, toggleMute }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const dispatch = useDispatch();
    const [tracked, setTracked] = useState(false);

    // ── Boost de video propio vs. anuncio externo ──────────────────
    // Un boost trae el contenido en promoted_content; un anuncio externo en creative.
    const isBoost = Boolean(ad?.is_boost);
    const boost = ad?.promoted_content ?? null;
    // Estado de "siguiendo" optimista para el botón Seguir del boost.
    const [isFollowing, setIsFollowing] = useState<boolean>(Boolean(boost?.author?.is_following));

    const videoSrc = isBoost
        ? boost?.video_url
        : (ad?.creative?.media_file?.startsWith("http")
            ? ad.creative.media_file
            : `${getBaseUrl()}media/${ad?.creative?.media_file}`);

    const title = isBoost ? (boost?.author?.username ? `@${boost.author.username}` : "") : ad?.creative?.title;
    const description = isBoost ? (boost?.description ?? "") : ad?.creative?.description;

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(() => { });
            if (isVisible && !tracked) {
                trackImpression();
                // User wants ads to start unmuted
                if (isMuted) {
                    toggleMute();
                }
            }
        }
    }, [isVisible]);

    const trackImpression = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            await axios.post(`${getBaseUrl()}api/ads/campaigns/${ad.id}/track_impression/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTracked(true);
        } catch (error) {
            console.error("Error tracking impression:", error);
        }
    };

    // Registra el click del ad (métrica) sin bloquear la acción del usuario.
    const trackClickMetric = () => {
        const token = localStorage.getItem("accessToken");
        axios.post(`${getBaseUrl()}api/ads/campaigns/${ad.id}/track_click/`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        }).catch((error) => console.error("Error tracking click:", error));
    };

    // Seguir al autor del video promocionado — misma lógica que el feed
    // (createFollower → /api/create-follower/), con estado optimista.
    const handleFollow = () => {
        const authorId = boost?.author?.id;
        if (!authorId || isFollowing) return;
        tapHaptic(ImpactStyle.Medium); // feedback háptico al seguir
        setIsFollowing(true); // optimista
        trackClickMetric();
        createFollower({ follower_user_id: authorId.toString() })(dispatch)
            .catch((err: any) => {
                console.error("❌ Error al seguir desde el boost:", err);
                setIsFollowing(false); // revertir si falla
            });
    };

    // Anuncio externo clásico: el click abre la URL de destino.
    const handleExternalClick = () => {
        trackClickMetric();
        if (ad?.creative?.destination_url) {
            window.open(ad.creative.destination_url, "_blank");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative h-full w-full rounded-xl overflow-hidden border border-cyan-500/20 bg-black shadow-2xl"
        >
            {/* Video Content */}
            <video
                ref={videoRef}
                muted={isMuted || !isVisible}
                loop
                playsInline
                className="h-full w-full object-cover"
                onClick={toggleMute}
            >
                <source src={videoSrc} type="video/mp4" />
            </video>

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

            {/* Ad Badges */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyan-500/30">
                    <Rocket className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Patrocinado</span>
                </div>
            </div>

            <motion.button
                whileTap={{ scale: 0.9 }}
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white"
                onClick={toggleMute}
            >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </motion.button>

            {/* Info Section */}
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white leading-tight drop-shadow-lg flex items-center gap-2">
                        {isBoost && boost?.author?.profile_picture && (
                            <img
                                src={boost.author.profile_picture}
                                alt={title}
                                className="w-8 h-8 rounded-full object-cover border border-white/30"
                            />
                        )}
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm text-gray-200 line-clamp-2 drop-shadow-md">
                            {description}
                        </p>
                    )}
                </div>

                {/* CTA Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={isBoost ? handleFollow : handleExternalClick}
                    disabled={isBoost && isFollowing}
                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white shadow-xl shadow-cyan-500/20 group overflow-hidden relative ${
                        isBoost && isFollowing
                            ? 'bg-white/15 backdrop-blur-md border border-white/20'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                    }`}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {isBoost ? (
                        isFollowing ? (
                            <>
                                Siguiendo
                                <UserCheck className="w-4 h-4" />
                            </>
                        ) : (
                            <>
                                Seguir
                                <UserPlus className="w-4 h-4" />
                            </>
                        )
                    ) : (
                        <>
                            {ad?.creative?.cta_text?.replace('_', ' ')}
                            <ExternalLink className="w-4 h-4" />
                        </>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
};

export default AdCard;
