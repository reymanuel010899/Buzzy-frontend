import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, ArrowLeft, AlertTriangle } from "lucide-react";
import axios from "axios";
import { getBaseUrl } from "../../redux/client/api-client";
import AdsDashboard from "../../components/ads/AdsDashboard";
import AdsCreationFlow from "../../components/ads/AdsCreationFlow";
import BottomNavbar from "../../components/Layout/ButtonNavar";

const AdsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"dashboard" | "create">("dashboard");
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);

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

        // Handle Stripe Return
        const params = new URLSearchParams(window.location.search);
        if (params.get('success')) {
            const campaignId = params.get('campaign_id');
            const sessionId = params.get('session_id');
            handlePaymentSuccess(campaignId, sessionId);
        }
        if (params.get('canceled')) {
            alert("Pago cancelado. Puedes intentar de nuevo cuando gustes.");
        }
    }, []);

    useEffect(() => {
        const handleRefresh = () => {
            fetchCampaigns();
            fetchStats();
        };
        window.addEventListener("buzzy:refresh", handleRefresh);
        return () => window.removeEventListener("buzzy:refresh", handleRefresh);
    }, []);

    const handlePaymentSuccess = async (campaignId: string | null, sessionId: string | null) => {
        if (!campaignId || !sessionId) return;

        try {
            setLoading(true);
            const token = localStorage.getItem("accessToken");
            // Verify with backend
            const response = await axios.get(`${getBaseUrl()}api/ads/campaigns/${campaignId}/verify_payment/?session_id=${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'paid') {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setActiveTab("dashboard");
                    fetchCampaigns();
                    fetchStats();
                    // Clean URL
                    window.history.replaceState({}, '', '/ads');
                }, 3000);
            } else {
                alert("El pago aún no se ha procesado. Si ya pagaste, espera unos segundos e intenta recargar.");
            }
        } catch (error) {
            console.error("Error verifying payment:", error);
            alert("Error al verificar el pago.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            const response = await axios.get(`${getBaseUrl()}api/ads/campaigns/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaigns(response.data);
        } catch (error) {
            console.error("Error fetching campaigns:", error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            const response = await axios.get(`${getBaseUrl()}api/ads/campaigns/dashboard_stats/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
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

            complexFormData.append("creative.title", campaignData.creative.title);
            complexFormData.append("creative.description", campaignData.creative.description);
            complexFormData.append("creative.cta_text", campaignData.creative.cta_text);
            complexFormData.append("creative.destination_url", campaignData.creative.destination_url);
            if (campaignData.creative.media) {
                complexFormData.append("creative.media_file", campaignData.creative.media);
            }

            complexFormData.append("budget.daily_budget", campaignData.budget.daily_budget.toString());
            complexFormData.append("budget.total_budget", campaignData.budget.total_budget.toString());
            complexFormData.append("budget.bidding_model", campaignData.budget.bidding_model || "CPM");

            const response = await axios.post(`${getBaseUrl()}api/ads/campaigns/`, complexFormData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const campaign = response.data;

            // Now create Stripe Session
            const stripeResponse = await axios.post(`${getBaseUrl()}api/ads/campaigns/${campaign.id}/create_checkout_session/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (stripeResponse.data.url) {
                window.location.href = stripeResponse.data.url;
            } else {
                throw new Error("No checkout URL received");
            }
        } catch (error) {
            console.error("Error launching campaign:", error);
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
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="py-20 flex flex-col items-center justify-center text-center space-y-4"
                            >
                                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                                    <Rocket className="w-12 h-12 text-emerald-400 animate-bounce" />
                                </div>
                                <h3 className="text-4xl font-bold text-white">¡Pago Exitoso!</h3>
                                <p className="text-gray-400 max-w-sm">Tu campaña está en revisión. Nuestro equipo la aprobará en menos de 24 horas y comenzará a mostrarse pronto.</p>
                            </motion.div>
                        ) : activeTab === "dashboard" ? (
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
