import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Plus, Layout, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { getBaseUrl } from "../../redux/client/api-client";
import AdsDashboard from "../../components/ads/AdsDashboard";
import AdsCreationFlow from "../../components/ads/AdsCreationFlow";

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
            complexFormData.append("status", "ACTIVE");

            complexFormData.append("audience.age_min", campaignData.audience.age_min.toString());
            complexFormData.append("audience.age_max", campaignData.audience.age_max.toString());
            complexFormData.append("audience.gender", campaignData.audience.gender);
            complexFormData.append("audience.locations", JSON.stringify(campaignData.audience.locations));
            complexFormData.append("audience.interests", JSON.stringify(campaignData.audience.interests));

            complexFormData.append("creative.title", campaignData.creative.title);
            complexFormData.append("creative.description", campaignData.creative.description);
            complexFormData.append("creative.cta_text", campaignData.creative.cta_text);
            complexFormData.append("creative.destination_url", campaignData.creative.destination_url);
            if (campaignData.creative.media) {
                complexFormData.append("creative.media_file", campaignData.creative.media);
            }

            complexFormData.append("budget.daily_budget", campaignData.budget.daily_budget.toString());
            complexFormData.append("budget.total_budget", campaignData.budget.total_budget.toString());

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
        <div className="min-h-screen bg-[#020412] text-white pt-12 pb-12 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Independent Back Button */}
                <div className="flex justify-start">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold text-gray-400 hover:text-white group"
                    >
                        <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                    </Link>
                </div>

                {/* Header Section - Refined Premium Design */}
                <div className="relative p-6 md:p-10 rounded-[48px] overflow-hidden group border border-white/5 shadow-2xl">
                    {/* Decorative background elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 via-[#020412] to-[#020412] z-0" />
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                        <div className="flex items-center gap-6">
                            <motion.div
                                initial={{ rotate: -10, scale: 0.9 }}
                                animate={{ rotate: 0, scale: 1 }}
                                className="p-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-xl shadow-cyan-500/20 border border-white/20"
                            >
                                <Rocket className="w-7 h-7 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-400 tracking-tight">
                                    Ads Manager
                                </h1>
                                <p className="text-[10px] md:text-xs text-cyan-400/60 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                    Performance & Reach Engine
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="flex bg-black/40 p-1.5 rounded-[20px] border border-white/10 backdrop-blur-3xl">
                                <button
                                    onClick={() => setActiveTab("dashboard")}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all duration-500 ${activeTab === 'dashboard' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Layout className="w-3.5 h-3.5" /> DASHBOARD
                                </button>
                                <button
                                    onClick={() => setActiveTab("create")}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all duration-500 ${activeTab === 'create' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Plus className="w-3.5 h-3.5" /> NUEVA CAMPAÑA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative">
                    <AnimatePresence mode="wait">
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
                                <h3 className="text-4xl font-bold text-white">¡Campaña Lanzada!</h3>
                                <p className="text-gray-400 max-w-sm">Tu anuncio está siendo procesado y comenzará a mostrarse pronto.</p>
                            </motion.div>
                        ) : activeTab === "dashboard" ? (
                            <motion.div
                                key="dashboard"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <AdsDashboard
                                    campaigns={campaigns}
                                    stats={stats}
                                    onRefresh={() => { fetchCampaigns(); fetchStats(); }}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="create"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
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
    );
};

export default AdsPage;
