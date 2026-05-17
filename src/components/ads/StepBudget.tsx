import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Zap, MapPin } from "lucide-react";
import axios from "axios";
import { getBaseUrl } from "../../redux/client/api-client";

interface BreakdownItem {
    location: string
    reach_low: number
    reach_high: number
    pct: number
}

interface StepBudgetProps {
    data: any;
    setData: (data: any) => void;
}

const StepBudget: React.FC<StepBudgetProps> = ({ data, setData }) => {
    const [reachLow, setReachLow]         = useState<number | null>(null)
    const [reachHigh, setReachHigh]       = useState<number | null>(null)
    const [breakdown, setBreakdown]       = useState<BreakdownItem[]>([])
    const [reachLoading, setReachLoading] = useState(false)

    const locations: string[] = (data.audience?.locations ?? []).filter(
        (l: string) => l && l !== "Mi Ubicación Actual"
    )

    const fmt = (n: number) => n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)

    useEffect(() => {
        const t = setTimeout(async () => {
            try {
                setReachLoading(true)
                const token = localStorage.getItem("accessToken")
                const params: any = {
                    total_budget: data.budget.total_budget,
                    age_min:      data.audience?.age_min ?? 18,
                    age_max:      data.audience?.age_max ?? 65,
                }
                if (locations.length > 0) params.locations = JSON.stringify(locations)
                if (data.audience?.latitude)  params.latitude  = data.audience.latitude
                if (data.audience?.longitude) params.longitude = data.audience.longitude
                if (data.audience?.radius)    params.radius    = data.audience.radius

                const res = await axios.get(`${getBaseUrl()}api/ads/campaigns/estimate_reach/`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                })
                setReachLow(res.data.reach_low)
                setReachHigh(res.data.reach_high)
                setBreakdown(res.data.breakdown ?? [])
            } catch {
                // keep nulls
            } finally {
                setReachLoading(false)
            }
        }, 500)
        return () => clearTimeout(t)
    }, [
        data.budget.total_budget,
        data.audience?.age_min,
        data.audience?.age_max,
        data.audience?.latitude,
        data.audience?.longitude,
        data.audience?.radius,
        JSON.stringify(locations),
    ])

    const duration = Math.round(data.budget.total_budget / data.budget.daily_budget)

    return (
        <div className="flex flex-col h-full gap-3">

            {/* ── Sliders ── */}
            <div className="flex flex-col gap-4 flex-shrink-0">

                {/* Daily budget */}
                <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Presupuesto Diario</span>
                        <span className="text-base font-black text-cyan-400">${data.budget.daily_budget}</span>
                    </div>
                    <input
                        type="range" min="1" max="100"
                        value={data.budget.daily_budget}
                        onChange={(e) => setData({ ...data, budget: { ...data.budget, daily_budget: parseInt(e.target.value) } })}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[9px] text-gray-600 font-bold">
                        <span>$1</span><span>$100 USD</span>
                    </div>
                </div>

                {/* Total budget */}
                <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Presupuesto Total</span>
                        <span className="text-base font-black text-blue-400">${data.budget.total_budget}</span>
                    </div>
                    <input
                        type="range" min="10" max="1000" step="10"
                        value={data.budget.total_budget}
                        onChange={(e) => setData({ ...data, budget: { ...data.budget, total_budget: parseInt(e.target.value) } })}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[9px] text-gray-600 font-bold">
                        <span>$10</span><span>$1,000 USD</span>
                    </div>
                </div>

                {/* Duration + Bidding side by side */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Duración</p>
                        <p className="text-sm font-black text-white">{duration} días</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 space-y-1.5">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Modelo de puja</p>
                        <div className="flex gap-1.5">
                            {["CPM", "CPC"].map(m => (
                                <button
                                    key={m} type="button"
                                    onClick={() => setData({ ...data, budget: { ...data.budget, bidding_model: m } })}
                                    className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                        (data.budget.bidding_model ?? "CPM") === m
                                            ? "bg-cyan-500 text-white"
                                            : "bg-white/5 text-gray-400 hover:text-white"
                                    }`}
                                >{m}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Reach card ── */}
            <div className="flex-1 min-h-0 bg-gradient-to-br from-cyan-600/15 via-blue-900/10 to-transparent border border-cyan-500/20 rounded-2xl flex flex-col items-center justify-center px-4 py-4 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full" />
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full" />

                <div className="relative z-10 w-full flex flex-col items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-cyan-500 shadow-lg shadow-cyan-500/20">
                        <Users className="w-5 h-5 text-white" />
                    </div>

                    <p className="text-[9px] font-black text-cyan-400/60 uppercase tracking-widest">Alcance Estimado</p>

                    {reachLoading ? (
                        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <span className="text-3xl font-black text-white tracking-tight">
                            {reachLow !== null && reachHigh !== null
                                ? `${fmt(reachLow)} – ${fmt(reachHigh)}`
                                : "—"}
                        </span>
                    )}

                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center">personas únicas en Buzzy</p>

                    {/* Per-location breakdown */}
                    {breakdown.length > 0 && (
                        <div className="w-full mt-1 space-y-1.5">
                            {breakdown.map((item, i) => (
                                <div key={i} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-[9px] font-bold">
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <MapPin className="w-2.5 h-2.5 text-cyan-500" />
                                            {item.location}
                                        </span>
                                        <span className="text-white">
                                            {fmt(item.reach_low)}–{fmt(item.reach_high)}
                                            <span className="text-gray-500 ml-1">({item.pct}%)</span>
                                        </span>
                                    </div>
                                    <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.pct}%` }}
                                            transition={{ duration: 0.6, delay: i * 0.1 }}
                                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {data.budget.total_budget >= 50 && (
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="mt-1 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2"
                        >
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                {data.budget.total_budget >= 100 ? "¡Alcance Premium!" : "¡Boost Activo!"}
                            </span>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StepBudget;
