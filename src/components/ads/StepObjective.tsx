import React from "react";
import { Globe, Users, DollarSign, Plus } from "lucide-react";

interface StepObjectiveProps {
    data: any;
    setData: (data: any) => void;
}

const StepObjective: React.FC<StepObjectiveProps> = ({ data, setData }) => {
    const objectives = [
        { id: 'TRAFFIC', title: 'Tráfico', desc: 'Envía más personas a tu sitio web o aplicación.', icon: Globe },
        { id: 'AWARENESS', title: 'Reconocimiento', desc: 'Llega al mayor número de personas posible.', icon: Users },
        { id: 'SALES', title: 'Ventas', desc: 'Encuentra personas con probabilidades de comprar.', icon: DollarSign },
        { id: 'FOLLOWERS', title: 'Seguidores', desc: 'Haz crecer tu comunidad en Buzzy.', icon: Plus },
    ];

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h3 className="text-lg font-black text-white uppercase tracking-wider">¿Cuál es tu objetivo?</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Selecciona lo que quieres lograr</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {objectives.map((obj) => (
                    <div
                        key={obj.id}
                        onClick={() => setData({ ...data, objective: obj.id })}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${data.objective === obj.id
                            ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/10'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                            }`}
                    >
                        <div className={`p-2.5 w-fit rounded-xl mb-4 ${data.objective === obj.id ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/10 text-gray-400'}`}>
                            <obj.icon className="w-5 h-5" />
                        </div>
                        <h4 className="text-[13px] font-black text-white uppercase tracking-tight mb-1">{obj.title}</h4>
                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{obj.desc}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Nombre de la campaña</label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    placeholder="Ej: Lanzamiento Colección Verano"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-cyan-500 transition-all"
                />
            </div>
        </div>
    );
};

export default StepObjective;
