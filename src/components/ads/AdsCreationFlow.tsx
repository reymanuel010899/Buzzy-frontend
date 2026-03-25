import React from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
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

const AdsCreationFlow: React.FC<AdsCreationFlowProps> = ({
    step, nextStep, prevStep, data, setData, onLaunch, loading
}) => {
    return (
        <div className="max-w-4xl mx-auto">
            {/* Progress Stepper */}
            <div className="flex items-center justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${step >= i ? 'bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-[#050718] border-white/10 text-gray-500'
                            }`}>
                            {step > i ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-black">{i}</span>}
                        </div>
                        <span className={`text-[9px] uppercase font-black tracking-widest ${step >= i ? 'text-cyan-400' : 'text-gray-600'}`}>
                            {['Objetivo', 'Audiencia', 'Contenido', 'Presupuesto'][i - 1]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
                {step === 1 && <StepObjective data={data} setData={setData} />}
                {step === 2 && <StepAudience data={data} setData={setData} />}
                {step === 3 && <StepCreative data={data} setData={setData} />}
                {step === 4 && <StepBudget data={data} setData={setData} />}
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/5">
                <button
                    onClick={prevStep}
                    disabled={step === 1 || loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                    <ChevronLeft className="w-5 h-5" /> Anterior
                </button>

                {step < 4 ? (
                    <button
                        onClick={nextStep}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-bold text-white shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        Continuar <ChevronRight className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        onClick={onLaunch}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-sm font-bold text-white shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? "Lanzando..." : "Lanzar Campaña"} <Rocket className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default AdsCreationFlow;
