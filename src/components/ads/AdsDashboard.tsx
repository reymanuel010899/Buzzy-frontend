import React from "react";
import { Users, TrendingUp, DollarSign, Rocket, RotateCcw } from "lucide-react";
import axios from "axios";
import { getBaseUrl } from "../../redux/client/api-client";

interface AdsDashboardProps {
    campaigns: any[];
    stats?: {
        total_reach: number;
        total_impressions: number;
        total_interactions: number;
        total_spent: number;
        active_campaigns: number;
    };
    onRefresh?: () => void;
}

const AdsDashboard: React.FC<AdsDashboardProps> = ({ campaigns, stats, onRefresh }) => {
    const handleRelaunch = async (id: number) => {
        try {
            const token = localStorage.getItem("accessToken");
            await axios.post(`${getBaseUrl()}api/ads/campaigns/${id}/relaunch/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onRefresh) onRefresh();
            alert("Campaña relanzada con éxito!");
        } catch (error) {
            console.error("Error relaunching:", error);
            alert("No se pudo relanzar la campaña.");
        }
    };

    const handlePay = async (id: number) => {
        try {
            const token = localStorage.getItem("accessToken");
            const response = await axios.post(`${getBaseUrl()}api/ads/campaigns/${id}/create_checkout_session/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error("Error initiating payment:", error);
            alert("No se pudo iniciar el pago.");
        }
    };

    return (
        <div className="space-y-8">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Alcance Total", value: stats?.total_reach?.toLocaleString() || "0", icon: Users, color: "text-blue-400" },
                    { label: "Interacciones", value: stats?.total_interactions?.toLocaleString() || "0", icon: TrendingUp, color: "text-emerald-400" },
                    { label: "Gasto Total", value: `$${stats?.total_spent?.toFixed(4) || "0.00"}`, icon: DollarSign, color: "text-amber-400" },
                    { label: "Campañas Activas", value: stats?.active_campaigns?.toString() || campaigns.length.toString(), icon: Rocket, color: "text-rose-400" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-2xl group hover:bg-white/[0.07] transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                {stat.label}
                            </span>
                            <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-white tracking-tight">
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Campaigns Table */}
            <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                        Tus Campañas
                    </h3>
                    <button className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors">
                        Ver todas
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-medium text-gray-500 uppercase tracking-wider border-b border-white/5">
                                <th className="px-6 py-2.5 whitespace-nowrap">Nombre</th>
                                <th className="px-6 py-2.5 whitespace-nowrap">Estado</th>
                                <th className="px-6 py-2.5 whitespace-nowrap">Presupuesto</th>
                                <th className="px-6 py-2.5 whitespace-nowrap">Objetivo</th>
                                <th className="px-6 py-2.5 whitespace-nowrap">Fecha</th>
                                <th className="px-6 py-2.5 whitespace-nowrap text-right">Acciones</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {campaigns.length > 0 ? (
                                campaigns.map((campaign, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-2.5 font-medium text-white group-hover:text-cyan-400 whitespace-nowrap">
                                            {campaign.name}
                                        </td>

                                        <td className="px-6 py-2.5 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${campaign.status === "ACTIVE"
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : campaign.status === "PAUSED"
                                                            ? "bg-amber-500/20 text-amber-400"
                                                            : campaign.status === "DRAFT"
                                                                ? "bg-cyan-500/20 text-cyan-400"
                                                                : "bg-white/10 text-gray-400"
                                                    }`}
                                            >
                                                {campaign.status}
                                            </span>
                                        </td>

                                        <td className="px-6 py-2.5 text-xs text-gray-300 whitespace-nowrap">
                                            ${campaign.budget?.total_budget || "0.00"}
                                        </td>

                                        <td className="px-6 py-2.5 text-xs text-gray-300 whitespace-nowrap">
                                            {campaign.objective}
                                        </td>

                                        <td className="px-6 py-2.5 text-xs text-gray-300 whitespace-nowrap">
                                            {new Date(campaign.created_at).toLocaleDateString()}
                                        </td>

                                        <td className="px-6 py-2.5 text-right space-x-2 whitespace-nowrap">
                                            {(campaign.status === "COMPLETED" ||
                                                campaign.status === "PAUSED") && (
                                                    <button
                                                        onClick={() => handleRelaunch(campaign.id)}
                                                        className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all group/btn"
                                                        title="Lanzar de nuevo"
                                                    >
                                                        <RotateCcw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" />
                                                    </button>
                                                )}

                                            {campaign.status === "DRAFT" && (
                                                <button
                                                    onClick={() => handlePay(campaign.id)}
                                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                >
                                                    <Rocket className="w-3.5 h-3.5" />
                                                    Pagar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No tienes campañas creadas aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdsDashboard