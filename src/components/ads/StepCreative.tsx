import React, { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Image as ImageIcon } from "lucide-react";

interface StepCreativeProps {
    data: any;
    setData: (data: any) => void;
    errors?: Record<string, boolean>;
    shakeTrigger?: number;
}

const shake = {
    x: [0, -8, 8, -8, 8, -4, 4, 0],
    transition: { duration: 0.45 }
}

const fieldClass = (hasError: boolean) =>
    `w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all ${
        hasError ? 'border-red-500' : 'border-white/10 focus:border-cyan-500'
    }`

const StepCreative: React.FC<StepCreativeProps> = ({ data, setData, errors = {}, shakeTrigger = 0 }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData({ ...data, creative: { ...data.creative, media: file } });
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">

            {/* ── Left: Editor ── */}
            <div className="flex flex-col gap-2 min-h-0">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Diseño del Anuncio</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Personaliza tu creatividad</p>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase font-bold">Título Gancho</label>
                    <motion.input
                        key={`title-${shakeTrigger}`}
                        animate={errors.title ? shake : {}}
                        type="text"
                        value={data.creative.title}
                        onChange={(e) => setData({ ...data, creative: { ...data.creative, title: e.target.value } })}
                        className={fieldClass(errors.title)}
                        placeholder="Ej: ¡Oferta exclusiva solo hoy!"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase font-bold">Descripción Corta</label>
                    <motion.textarea
                        key={`desc-${shakeTrigger}`}
                        animate={errors.description ? shake : {}}
                        value={data.creative.description}
                        onChange={(e) => setData({ ...data, creative: { ...data.creative, description: e.target.value } })}
                        className={`${fieldClass(errors.description)} h-20 resize-none`}
                        placeholder="Cuéntales por qué deberían hacer clic..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold">Llamado a la Acción</label>
                        <select
                            value={data.creative.cta_text}
                            onChange={(e) => setData({ ...data, creative: { ...data.creative, cta_text: e.target.value } })}
                            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-white text-sm appearance-none focus:outline-none focus:border-cyan-500 transition-all [&>option]:bg-[#0d1117] [&>option]:text-white"
                        >
                            <option value="LEARN_MORE">Más Información</option>
                            <option value="SHOP_NOW">Comprar Ahora</option>
                            <option value="SIGN_UP">Registrarse</option>
                            <option value="WATCH_VIDEO">Ver Video</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold">URL de Destino</label>
                        <motion.input
                            key={`url-${shakeTrigger}`}
                            animate={errors.destination_url ? shake : {}}
                            type="url"
                            value={data.creative.destination_url}
                            onChange={(e) => setData({ ...data, creative: { ...data.creative, destination_url: e.target.value } })}
                            className={fieldClass(errors.destination_url)}
                            placeholder="https://tusitio.com"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase font-bold">Media (Video/Imagen)</label>
                    <motion.div key={`media-${shakeTrigger}`} animate={errors.media ? shake : {}}>
                        <input type="file" id="media-upload" onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                        <label
                            htmlFor="media-upload"
                            className={`flex items-center gap-3 border-2 border-dashed rounded-2xl px-4 py-3 cursor-pointer transition-all hover:bg-white/5 ${
                                errors.media ? 'border-red-500/60' : 'border-white/10 hover:border-cyan-500/50'
                            }`}
                        >
                            <Upload className={`w-5 h-5 flex-shrink-0 ${errors.media ? 'text-red-400' : 'text-gray-500'}`} />
                            <span className="text-xs text-gray-400 truncate">
                                {data.creative.media ? data.creative.media.name : "Sube tu video o imagen"}
                            </span>
                        </label>
                    </motion.div>
                </div>
            </div>

            {/* ── Right: Phone preview ── */}
            <div className="flex flex-col items-center justify-center gap-2">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.25em]">Vista Previa Real</p>

                <div className="w-[200px] h-[340px] bg-black rounded-[32px] border-[6px] border-gray-900 shadow-2xl overflow-hidden relative">
                    {previewUrl ? (
                        data.creative.media?.type.startsWith('video') ? (
                            <video src={previewUrl} autoPlay muted loop className="w-full h-full object-cover" />
                        ) : (
                            <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                        )
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <ImageIcon className="w-8 h-8 text-gray-800" />
                        </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black via-black/50 to-transparent pt-8">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[7px] font-bold">AD</div>
                            <div>
                                <p className="text-[8px] font-bold text-white leading-none">Patrocinado</p>
                                <p className="text-[7px] text-gray-400">Buzzy Ads</p>
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-white truncate">{data.creative.title || "Tu título aquí"}</p>
                        <p className="text-[8px] text-gray-300 line-clamp-2 mt-0.5">{data.creative.description || "Tu descripción aparecerá aquí para atraer usuarios."}</p>
                        <button className="w-full mt-1.5 py-1 bg-white text-black rounded-lg text-[8px] font-black uppercase tracking-wide">
                            {data.creative.cta_text.replace('_', ' ')}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default StepCreative;
