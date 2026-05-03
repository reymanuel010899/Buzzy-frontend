import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronLeft, Rocket } from "lucide-react";
import StepObjective from "./StepObjective";
import StepAudience from "./StepAudience";
import StepCreative from "./StepCreative";
import StepBudget from "./StepBudget";

interface AdsCreationFlowProps {
    step: number;
    nextStep: () => void;
    prevStep: () => void;
    data: any;
    setData: (data: any) => void;
    onLaunch: () => void;
    loading: boolean;
}

const STEPS = ['Objetivo', 'Audiencia', 'Contenido', 'Presupuesto']

const shake = {
    x: [0, -8, 8, -8, 8, -4, 4, 0],
    transition: { duration: 0.45 }
}

function validate(step: number, data: any): Record<string, boolean> {
    if (step === 1) {
        return {
            name: !data.name?.trim(),
        }
    }
    if (step === 2) {
        return {
            locations: (data.audience?.locations ?? []).length === 0,
        }
    }
    if (step === 3) {
        return {
            title:           !data.creative.title?.trim(),
            description:     !data.creative.description?.trim(),
            destination_url: !data.creative.destination_url?.trim(),
            media:           !data.creative.media,
        }
    }
    return {}
}

const AdsCreationFlow: React.FC<AdsCreationFlowProps> = ({
    step, nextStep, prevStep, data, setData, onLaunch, loading
}) => {
    const [errors, setErrors] = useState<Record<string, boolean>>({})
    const [shakeTrigger, setShakeTrigger] = useState(0)

    const handleNext = () => {
        const errs = validate(step, data)
        const hasErrors = Object.values(errs).some(Boolean)
        if (hasErrors) {
            setErrors(errs)
            setShakeTrigger(t => t + 1)
            return
        }
        setErrors({})
        nextStep()
    }

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-2 px-1 h-full min-h-0">

            {/* ── Progress stepper ── */}
            <div className="flex items-center justify-between relative flex-shrink-0 pb-0">
                <div className="absolute top-3 left-0 right-0 h-px bg-white/5 z-0" />
                {STEPS.map((label, idx) => {
                    const i = idx + 1
                    const done    = step > i
                    const active  = step === i
                    return (
                        <div key={i} className="relative z-10 flex flex-col items-center gap-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 text-[9px] font-black
                                ${active  ? 'bg-cyan-500 border-cyan-500 text-white shadow shadow-cyan-500/30' :
                                  done    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400' :
                                            'bg-[#050718] border-white/10 text-gray-600'}`}
                            >
                                {done ? <CheckCircle2 className="w-3 h-3" /> : i}
                            </div>
                            <span className={`text-[8px] uppercase font-black tracking-widest ${active ? 'text-cyan-400' : done ? 'text-cyan-600' : 'text-gray-700'}`}>
                                {label}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* ── Step content ── */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full overflow-y-auto"
                    >
                        {step === 1 && <StepObjective data={data} setData={setData} errors={errors} shakeTrigger={shakeTrigger} />}
                        {step === 2 && <StepAudience  data={data} setData={setData} errors={errors} shakeTrigger={shakeTrigger} />}
                        {step === 3 && <StepCreative  data={data} setData={setData} errors={errors} shakeTrigger={shakeTrigger} />}
                        {step === 4 && <StepBudget    data={data} setData={setData} />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-shrink-0">
                {/* Back arrow */}
                <motion.button
                    onClick={prevStep}
                    disabled={step === 1 || loading}
                    whileHover={{ x: -3 }}
                    whileTap={{ scale: 0.9 }}
                    className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
                >
                    <motion.span
                        animate={{ x: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                        className="text-gray-500 group-hover:text-cyan-400 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Anterior</span>
                </motion.button>

                {/* Forward / Launch */}
                {step < 4 ? (
                    <motion.button
                        onClick={handleNext}
                        key={shakeTrigger}
                        animate={shakeTrigger > 0 && Object.values(errors).some(Boolean) ? shake : {}}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.93 }}
                        className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white hover:border-cyan-500 transition-all"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">Continuar</span>
                        <motion.span
                            animate={{ x: [0, 4, 0], y: [0, -2, 0] }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                            style={{ display: "inline-flex", rotate: "45deg" }}
                        >
                            <Rocket className="w-4 h-4" />
                        </motion.span>
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={onLaunch}
                        disabled={loading}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative flex items-center gap-2 px-5 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest overflow-hidden shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg,#10b981,#0ea5e9)" }}
                    >
                        <motion.span
                            className="absolute inset-0 bg-white/20"
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            style={{ skewX: "-20deg" }}
                        />
                        <span className="relative z-10">{loading ? "Lanzando…" : "Lanzar Campaña"}</span>
                        <Rocket className="w-4 h-4 relative z-10" />
                    </motion.button>
                )}
            </div>
        </div>
    );
};

export default AdsCreationFlow;
