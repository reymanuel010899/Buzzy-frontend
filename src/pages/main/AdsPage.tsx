import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, ArrowLeft, AlertTriangle } from "lucide-react";
import axios from "axios";
import { useSearchParams, useLocation } from "react-router-dom";
import { getBaseUrl } from "../../redux/client/api-client";
import AdsDashboard from "../../components/ads/AdsDashboard";
import AdsCreationFlow from "../../components/ads/AdsCreationFlow";
import BottomNavbar from "../../components/Layout/ButtonNavar";

const AdsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<"dashboard" | "create">("dashboard");
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);

    // Boost de un video propio: cuando se entra con ?boost=<uuid> el flujo
    // promociona ese video en vez de crear un anuncio externo (sin paso de creative).
    const [boostVideoUuid, setBoostVideoUuid] = useState<string | null>(null);
    // Datos del video para mostrar su preview dentro del wizard.
    const [boostVideo, setBoostVideo] = useState<any | null>(null);
    const isBoost = Boolean(boostVideoUuid);

    const [campaignData, setCampaignData] = useState({
        name: "",
        objective: "TRAFFIC",
        audience: {
            age_min: 18,
            age_max: 65,
            gender: "ALL",
            locations: [] as string[],
            interests: [] as string[],
            latitude: null as number | null,
            longitude: null as number | null,
            radius: 50,
            max_frequency: 3,
        },
        creative: {
            title: "",
            description: "",
            media: null as File | null,
            cta_text: "LEARN_MORE",
            destination_url: "",
        },
        budget: {
            daily_budget: 5,
            total_budget: 50,
            bidding_model: "CPM",
        }
    });

    useEffect(() => {
        fetchCampaigns();
        fetchStats();
    }, []);

    // Handle Stripe canceled return
    useEffect(() => {
        if (searchParams.get('canceled')) {
            alert("Pago cancelado. Puedes intentar de nuevo cuando gustes.");
            setSearchParams({}, { replace: true });
        }
    }, [searchParams]);

    // Entrar en modo "promocionar video" si llega ?boost=<uuid>
    useEffect(() => {
        const boost = searchParams.get('boost');
        if (!boost) return;

        setBoostVideoUuid(boost);
        setActiveTab("create");
        setStep(1);
        // Objetivo por defecto más natural para boost de contenido propio.
        setCampaignData(prev => ({ ...prev, objective: "AWARENESS" }));

        // 1. Preview inmediato: el video viene en el state de navegación.
        const fromState = (location.state as any)?.boostVideo;
        if (fromState?.uuid === boost) {
            setBoostVideo(fromState);
            return;
        }

        // 2. Fallback (entrada por URL directa): traer el video por uuid.
        (async () => {
            const b = base();
            if (!b) return;
            try {
                const token = localStorage.getItem("accessToken");
                const res = await axios.get(`${b}/api/videos/${boost}/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setBoostVideo(res.data);
            } catch { /* sin preview si falla; el flujo sigue funcionando */ }
        })();
    }, [searchParams, location.state]);

    useEffect(() => {
        const handleRefresh = () => {
            fetchCampaigns();
            fetchStats();
        };
        window.addEventListener("buzzy:refresh", handleRefresh);
        return () => window.removeEventListener("buzzy:refresh", handleRefresh);
    }, []);

    const base = () => {
        const url = getBaseUrl();
        return url?.startsWith('http') ? url.replace(/\/+$/, '') : null;
    };


    const fetchCampaigns = async () => {
        const b = base();
        if (!b) return;
        try {
            const token = localStorage.getItem("accessToken");
            const response = await axios.get(`${b}/api/ads/campaigns/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaigns(response.data);
        } catch { }
    };

    const fetchStats = async () => {
        const b = base();
        if (!b) return;
        try {
            const token = localStorage.getItem("accessToken");
            const response = await axios.get(`${b}/api/ads/campaigns/dashboard_stats/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch { }
    };

    const handleLaunch = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const complexFormData = new FormData();

            complexFormData.append("name", campaignData.name);
            complexFormData.append("objective", campaignData.objective);
            complexFormData.append("status", "DRAFT");

            complexFormData.append("audience.age_min", campaignData.audience.age_min.toString());
            complexFormData.append("audience.age_max", campaignData.audience.age_max.toString());
            complexFormData.append("audience.gender", campaignData.audience.gender);
            complexFormData.append("audience.locations", JSON.stringify(campaignData.audience.locations));
            complexFormData.append("audience.interests", JSON.stringify(campaignData.audience.interests));
            if (campaignData.audience.latitude !== null) {
                complexFormData.append("audience.latitude", campaignData.audience.latitude.toString());
            }
            if (campaignData.audience.longitude !== null) {
                complexFormData.append("audience.longitude", campaignData.audience.longitude.toString());
            }
            complexFormData.append("audience.radius", (campaignData.audience.radius || 50).toString());
            complexFormData.append("audience.max_frequency", (campaignData.audience.max_frequency || 3).toString());

            if (isBoost) {
                // Boost de video propio: el video es el creative, no se manda creative externo.
                complexFormData.append("promoted_video_uuid", boostVideoUuid as string);
            } else {
                complexFormData.append("creative.title", campaignData.creative.title);
                complexFormData.append("creative.description", campaignData.creative.description);
                complexFormData.append("creative.cta_text", campaignData.creative.cta_text);
                complexFormData.append("creative.destination_url", campaignData.creative.destination_url);
                if (campaignData.creative.media) {
                    complexFormData.append("creative.media_file", campaignData.creative.media);
                }
            }

            complexFormData.append("budget.daily_budget", campaignData.budget.daily_budget.toString());
            complexFormData.append("budget.total_budget", campaignData.budget.total_budget.toString());
            complexFormData.append("budget.bidding_model", campaignData.budget.bidding_model || "CPM");

            const b = base();
            if (!b) { alert("Error de configuración."); return; }
            const response = await axios.post(`${b}/api/ads/campaigns/`, complexFormData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const campaign = response.data;

            const stripeResponse = await axios.post(`${b}/api/ads/campaigns/${campaign.id}/create_checkout_session/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (stripeResponse.data.url) {
                window.location.href = stripeResponse.data.url;
            } else {
                throw new Error("No checkout URL received");
            }
        } catch (error) {
            alert("Error al iniciar el proceso de pago.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <div className="h-screen bg-[#020412] text-white flex flex-col overflow-hidden px-3 md:px-6 pt-2 pb-20">
            <div className="max-w-7xl mx-auto w-full flex flex-col h-full gap-2">

                {/* ── Top bar ── */}
                <div className="flex items-center gap-3 flex-shrink-0 py-1">
                    {/* Back arrow — only when creating */}
                    {activeTab === "create" && (
                        <button onClick={() => setActiveTab("dashboard")} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white flex-shrink-0">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}

                    {/* Logo + title */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20 flex-shrink-0">
                            <Rocket className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-white tracking-tight leading-none truncate">Ads Manager</h1>
                            <p className="text-[9px] text-cyan-400/60 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse flex-shrink-0" />
                                Performance & Reach Engine
                            </p>
                        </div>
                    </div>

                    {/* Nueva campaña */}
                    {activeTab === "dashboard" && (
                        <motion.button
                            onClick={() => setActiveTab("create")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.93 }}
                            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest overflow-hidden shadow-lg shadow-cyan-500/25 flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#06b6d4,#6366f1)" }}
                        >
                            <motion.span
                                className="absolute inset-0 bg-white/15"
                                animate={{ x: ["-100%", "200%"] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                                style={{ skewX: "-20deg" }}
                            />
                            <span className="relative z-10">Nueva</span>
                            <motion.span
                                animate={{ x: [0, 4, 0], y: [0, -2, 0] }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                className="relative z-10"
                                style={{ display: "inline-flex", rotate: "45deg" }}
                            >
                                <Rocket className="w-3.5 h-3.5" />
                            </motion.span>
                        </motion.button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative min-h-0 h-full">
                    <AnimatePresence mode="wait" initial={false}>
                        {activeTab === "dashboard" ? (
                            <motion.div
                                key="dashboard"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col gap-2 h-full"
                            >
                                {campaigns.some(c => c.status === 'IN_REVIEW') && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex-shrink-0">
                                        <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                        <p className="text-[10px] text-yellow-300/80 font-bold">
                                            {campaigns.filter(c => c.status === 'IN_REVIEW').length} campaña(s) en revisión — aprobación en menos de 24h.
                                        </p>
                                    </div>
                                )}
                                <AdsDashboard
                                    campaigns={campaigns}
                                    stats={stats}
                                    onRefresh={() => { fetchCampaigns(); fetchStats(); }}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="create"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={{ height: "100%", overflow: "hidden" }}
                            >
                                <AdsCreationFlow
                                    step={step}
                                    nextStep={() => setStep(s => Math.min(s + 1, 4))}
                                    prevStep={() => setStep(s => Math.max(s - 1, 1))}
                                    data={campaignData}
                                    setData={setCampaignData}
                                    onLaunch={handleLaunch}
                                    loading={loading}
                                    isBoost={isBoost}
                                    boostVideo={boostVideo}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
        <BottomNavbar />
        </>
    );
};

export default AdsPage;
