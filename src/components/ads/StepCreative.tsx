import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, Eye, X } from "lucide-react";
import { pickMedia } from "../../hooks/useMediaPicker";

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
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const handleFilePick = async () => {
        const picked = await pickMedia("any", 100);
        if (picked) {
            setData({ ...data, creative: { ...data.creative, media: picked.file } });
            setPreviewUrl(picked.url);
        }
    };

    const ctaLabel = (data.creative.cta_text || "LEARN_MORE").replace(/_/g, ' ');

    return (
        <div className="flex flex-col gap-4 h-full">

            {/* Header */}
            <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Diseño del Anuncio</h3>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Personaliza tu creatividad</p>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3">
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

                <div className="grid grid-cols-2 gap-3">
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
                        <button
                            type="button"
                            onClick={handleFilePick}
                            className={`w-full flex items-center gap-3 border-2 border-dashed rounded-2xl px-4 py-3 cursor-pointer transition-all hover:bg-white/5 ${
                                errors.media ? 'border-red-500/60' : 'border-white/10 hover:border-cyan-500/50'
                            }`}
                        >
                            <Upload className={`w-5 h-5 flex-shrink-0 ${errors.media ? 'text-red-400' : 'text-gray-500'}`} />
                            <span className="text-xs text-gray-400 truncate">
                                {data.creative.media ? data.creative.media.name : "Sube tu video o imagen"}
                            </span>
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Preview button */}
            <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-300 text-sm font-bold hover:from-cyan-500/20 hover:to-blue-500/20 hover:border-cyan-400/60 transition-all"
            >
                <Eye size={16} />
                Ver preview del anuncio
            </button>

            {/* Preview Modal */}
            <AnimatePresence>
                {showPreviewModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
                        onClick={() => setShowPreviewModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.88, opacity: 0, y: 24 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.88, opacity: 0, y: 24 }}
                            transition={{ type: "spring", stiffness: 320, damping: 28 }}
                            className="relative flex flex-col items-center gap-4"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close */}
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                            >
                                <X size={15} />
                            </button>

                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Vista Previa Real</p>

                            {/* Phone frame */}
                            <div className="w-[220px] h-[390px] bg-black rounded-[36px] border-[6px] border-gray-800 shadow-2xl shadow-black/60 overflow-hidden relative">
                                {previewUrl ? (
                                    data.creative.media?.type.startsWith('video') ? (
                                        <video src={previewUrl} autoPlay muted loop className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                                    )
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900">
                                        <ImageIcon className="w-10 h-10 text-gray-700" />
                                        <span className="text-[10px] text-gray-600 font-semibold">Sin media</span>
                                    </div>
                                )}

                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/60 to-transparent pt-10">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[7px] font-bold">AD</div>
                                        <div>
                                            <p className="text-[9px] font-bold text-white leading-none">Patrocinado</p>
                                            <p className="text-[8px] text-gray-400">Buzzy Ads</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-white truncate">{data.creative.title || "Tu título aquí"}</p>
                                    <p className="text-[9px] text-gray-300 line-clamp-2 mt-0.5">{data.creative.description || "Tu descripción aparecerá aquí para atraer usuarios."}</p>
                                    <button className="w-full mt-2 py-1.5 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-wide">
                                        {ctaLabel}
                                    </button>
                                </div>
                            </div>

                            <p className="text-[10px] text-white/30 text-center max-w-[200px]">
                                Así se verá tu anuncio en el feed de Buzzy
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StepCreative;
