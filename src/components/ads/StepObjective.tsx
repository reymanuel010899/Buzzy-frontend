import React from "react";
import { motion } from "framer-motion";
import { Globe, Users, DollarSign, UserPlus } from "lucide-react";

interface StepObjectiveProps {
    data: any;
    setData: (data: any) => void;
    errors?: Record<string, boolean>;
    shakeTrigger?: number;
}

const objectives = [
    { id: 'TRAFFIC',   title: 'Tráfico',       desc: 'Envía personas a tu sitio web o app.',   icon: Globe,     color: 'from-cyan-500 to-blue-500',    cta: 'LEARN_MORE' },
    { id: 'AWARENESS', title: 'Reconocimiento', desc: 'Llega al mayor número de personas.',     icon: Users,     color: 'from-violet-500 to-purple-500', cta: 'LEARN_MORE' },
    { id: 'SALES',     title: 'Ventas',         desc: 'Personas con intención de compra.',      icon: DollarSign,color: 'from-emerald-500 to-teal-500',  cta: 'SHOP_NOW'   },
    { id: 'FOLLOWERS', title: 'Seguidores',     desc: 'Haz crecer tu comunidad en Buzzy.',      icon: UserPlus,  color: 'from-rose-500 to-pink-500',     cta: 'SIGN_UP'    },
]

const shake = {
    x: [0, -8, 8, -8, 8, -4, 4, 0],
    transition: { duration: 0.45 }
}

const StepObjective: React.FC<StepObjectiveProps> = ({ data, setData, errors = {}, shakeTrigger = 0 }) => {
    return (
        <div className="flex flex-col h-full gap-2">
            <div className="text-center flex-shrink-0">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">¿Cuál es tu objetivo?</h3>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Selecciona lo que quieres lograr</p>
            </div>

            {/* Objectives — fixed height, no flex-1 stretch */}
            <div className="flex flex-col gap-2 flex-shrink-0">
                {objectives.map((obj) => {
                    const active = data.objective === obj.id
                    return (
                        <div
                            key={obj.id}
                            onClick={() => setData({ ...data, objective: obj.id, creative: { ...data.creative, cta_text: obj.cta } })}
                            className={`flex items-center gap-3 px-3 py-8 rounded-xl border cursor-pointer transition-all duration-200 ${
                                active
                                    ? 'bg-white/5 border-cyan-500 shadow shadow-cyan-500/10'
                                    : 'bg-white/[0.03] border-white/5 hover:border-white/15'
                            }`}
                        >
                            <div className={`p-2 rounded-xl flex-shrink-0 bg-gradient-to-br ${obj.color} shadow-lg`}>
                                <obj.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-black text-white uppercase tracking-tight leading-none">{obj.title}</h4>
                                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{obj.desc}</p>
                            </div>
                            {active && (
                                <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 shadow shadow-cyan-400/50" />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Spacer to push input to bottom */}
            <div className="flex-1" />

            {/* Campaign name */}
            <div className="flex-shrink-0 space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Nombre de la campaña</label>
                <motion.input
                    key={`name-${shakeTrigger}`}
                    animate={errors.name ? shake : {}}
                    type="text"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    placeholder="Ej: Lanzamiento Colección Verano"
                    className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all ${
                        errors.name
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-white/10 focus:border-cyan-500'
                    }`}
                />
            </div>
        </div>
    );
};

export default StepObjective;
