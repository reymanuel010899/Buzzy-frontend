import React, { useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";

interface StepCreativeProps {
    data: any;
    setData: (data: any) => void;
}

const StepCreative: React.FC<StepCreativeProps> = ({ data, setData }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData({ ...data, creative: { ...data.creative, media: file } });
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Editor */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Diseño del Anuncio</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Personaliza tu creatividad</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold">Título Gancho</label>
                        <input
                            type="text"
                            value={data.creative.title}
                            onChange={(e) => setData({ ...data, creative: { ...data.creative, title: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                            placeholder="Ej: ¡Oferta exclusiva solo hoy!"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold">Descripción Corta</label>
                        <textarea
                            value={data.creative.description}
                            onChange={(e) => setData({ ...data, creative: { ...data.creative, description: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm h-24 resize-none"
                            placeholder="Cuéntales por qué deberían hacer clic..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Llamado a la Acción</label>
                            <select
                                value={data.creative.cta_text}
                                onChange={(e) => setData({ ...data, creative: { ...data.creative, cta_text: e.target.value } })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm appearance-none"
                            >
                                <option value="LEARN_MORE">Más Información</option>
                                <option value="SHOP_NOW">Comprar Ahora</option>
                                <option value="SIGN_UP">Registrarse</option>
                                <option value="WATCH_VIDEO">Ver Video</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">URL de Destino</label>
                            <input
                                type="url"
                                value={data.creative.destination_url}
                                onChange={(e) => setData({ ...data, creative: { ...data.creative, destination_url: e.target.value } })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                                placeholder="https://tusitio.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold">Media (Video/Imagen)</label>
                        <div className="relative group overflow-hidden">
                            <input
                                type="file"
                                id="media-upload"
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*,video/*"
                            />
                            <label
                                htmlFor="media-upload"
                                className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-8 hover:bg-white/5 hover:border-cyan-500/50 cursor-pointer transition-all"
                            >
                                <Upload className="w-8 h-8 text-gray-500 mb-2 group-hover:text-cyan-400 group-hover:scale-110 transition-all" />
                                <span className="text-xs text-gray-400">{data.creative.media ? data.creative.media.name : "Sube tu video o imagen"}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Real-time Preview */}
            <div className="flex flex-col items-center justify-center p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.25em] mb-6">Vista Previa Real</h4>

                <div className="w-[280px] h-[500px] bg-black rounded-[40px] border-8 border-gray-900 shadow-2xl overflow-hidden relative group">
                    {previewUrl ? (
                        <div className="absolute inset-0">
                            {data.creative.media?.type.startsWith('video') ? (
                                <video src={previewUrl} autoPlay muted loop className="w-full h-full object-cover" />
                            ) : (
                                <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                            )}
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <ImageIcon className="w-12 h-12 text-gray-800" />
                        </div>
                    )}

                    {/* Ad Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/50 to-transparent pt-12">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold">AD</div>
                            <div>
                                <h5 className="text-xs font-bold text-white leading-tight">Patrocinado</h5>
                                <p className="text-[10px] text-gray-300">Buzzy Ads</p>
                            </div>
                        </div>
                        <h6 className="text-sm font-bold text-white mb-1 line-clamp-1">{data.creative.title || "Tu título aquí"}</h6>
                        <p className="text-[10px] text-gray-300 line-clamp-2 mb-3">{data.creative.description || "Tu descripción publicitaria aparecerá en esta sección para atraer usuarios."}</p>
                        <button className="w-full py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-cyan-400 transition-colors uppercase tracking-wider">
                            {data.creative.cta_text.replace('_', ' ')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepCreative;
