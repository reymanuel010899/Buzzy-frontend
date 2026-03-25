import React from "react";
import { motion } from "framer-motion";
import { Calendar, Target } from "lucide-react";

interface StepBudgetProps {
    data: any;
    setData: (data: any) => void;
}

const StepBudget: React.FC<StepBudgetProps> = ({ data, setData }) => {
    return (
        <div className="max-w-xl mx-auto space-y-12">
            <div className="text-center">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">Presupuesto</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Configura tu inversión y duración</p>
            </div>

            <div className="space-y-8">
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-gray-400 uppercase">Presupuesto Diario</label>
                        <span className="text-2xl font-bold text-cyan-400">${data.budget.daily_budget}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={data.budget.daily_budget}
                        onChange={(e) => setData({ ...data, budget: { ...data.budget, daily_budget: parseInt(e.target.value) } })}
                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase">
                        <span>$1 USD</span>
                        <span>$100 USD</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-gray-400 uppercase">Presupuesto Total Estimado</label>
                        <span className="text-2xl font-bold text-blue-400">${data.budget.total_budget}</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="1000"
                        step="10"
                        value={data.budget.total_budget}
                        onChange={(e) => setData({ ...data, budget: { ...data.budget, total_budget: parseInt(e.target.value) } })}
                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase">
                        <span>$10 USD</span>
                        <span>$1,000 USD</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                            <Calendar className="w-6 h-6 text-rose-400" />
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase font-black">Duración</p>
                                <p className="text-sm font-bold text-white">{Math.round(data.budget.total_budget / data.budget.daily_budget)} Días</p>
                            </div>
                        </div>
                        {/* Placeholder for symmetry or other info */}
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4 opacity-50">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-gray-400">?</div>
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase font-black">Motor</p>
                                <p className="text-xs font-bold text-white">Buzzy Ads Engine</p>
                            </div>
                        </div>
                    </div>

                    {/* PROMINENT CENTERED REACH BOX (As per user screenshot) */}
                    <div className="pt-8">
                        <div className="bg-gradient-to-br from-cyan-600/20 via-blue-900/10 to-transparent border border-cyan-500/30 p-5 rounded-[40px] flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group shadow-2xl shadow-cyan-500/10">
                            {/* Decorative background effects */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-700" />
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700" />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="p-4 rounded-2xl bg-cyan-500 shadow-lg shadow-cyan-500/20 text-white"
                            >
                                <Target className="w-7 h-7" />
                            </motion.div>

                            <div className="space-y-2 relative z-10">
                                <h4 className="text-lg font-black text-white uppercase tracking-[0.2em]">Alcance Estimado</h4>
                                <div className="flex flex-col items-center">
                                    <span className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-400 tracking-tighter drop-shadow-2xl">
                                        {(() => {
                                            const total = data.budget.total_budget;
                                            const rate = 700 + total; // Better bonus for high budget
                                            const reach = total * rate;
                                            return reach >= 1000 ? `${(reach / 1000).toFixed(0)}k` : reach;
                                        })()} - {(() => {
                                            const total = data.budget.total_budget;
                                            const rate = 700 + total;
                                            const reach = total * rate * 1.6; // Upper bound range
                                            return reach >= 1000 ? `${(reach / 1000).toFixed(0)}k` : Math.round(reach);
                                        })()}
                                    </span>
                                    <p className="text-cyan-400/60 text-xs mt-4 font-bold uppercase tracking-widest max-w-[280px]">
                                        Personas por día basado en tu presupuesto actual e inversión total.
                                    </p>

                                    {data.budget.total_budget >= 50 && (
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="mt-6 px-6 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-3 backdrop-blur-md"
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                                                {data.budget.total_budget >= 100 ? "¡OFERTA PREMIUM ACTIVADA!" : "¡CARINITO POR CONFIAR!"}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepBudget;
