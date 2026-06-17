import React from "react";
import { Image as ImageIcon, Rocket } from "lucide-react";

interface StepBoostPreviewProps {
    /** Video propio que se está promocionando (uuid, video_url, thumbnail_url, description, media_type). */
    boostVideo: any | null;
    /** Username del autor, para mostrarlo en el mock como en el feed real. */
    authorUsername?: string;
}

/**
 * Vista previa real del boost: muestra el MISMO mockup de teléfono que el paso
 * "Contenido" de los anuncios externos, pero alimentado con el video propio que
 * el usuario promociona. Así ve exactamente cómo aparecerá en el feed de Buzzy.
 */
const StepBoostPreview: React.FC<StepBoostPreviewProps> = ({ boostVideo, authorUsername }) => {
    const isImage = boostVideo?.media_type === "image";
    const mediaSrc = boostVideo?.video_url || boostVideo?.thumbnail_url;

    return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Vista Previa Real</h3>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                    Así se verá tu video promocionado
                </p>
            </div>

            {/* Phone frame — mismo estilo que el preview de anuncios externos */}
            <div className="w-[220px] h-[390px] bg-black rounded-[36px] border-[6px] border-gray-800 shadow-2xl shadow-black/60 overflow-hidden relative flex-shrink-0">
                {mediaSrc ? (
                    isImage ? (
                        <img src={mediaSrc} className="w-full h-full object-cover" alt="preview" />
                    ) : (
                        <video
                            src={boostVideo.video_url}
                            poster={boostVideo.thumbnail_url || undefined}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    )
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900">
                        <ImageIcon className="w-10 h-10 text-gray-700" />
                        <span className="text-[10px] text-gray-600 font-semibold">Cargando video…</span>
                    </div>
                )}

                {/* Overlay inferior con badge Patrocinado + autor + descripción */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/60 to-transparent pt-10">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                            <Rocket className="w-3 h-3 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-white leading-none">Patrocinado</p>
                            <p className="text-[8px] text-gray-400">
                                {authorUsername ? `@${authorUsername}` : "Tu video"}
                            </p>
                        </div>
                    </div>
                    <p className="text-[9px] text-gray-300 line-clamp-2 mt-0.5">
                        {boostVideo?.description || "Sin descripción"}
                    </p>
                    <button className="w-full mt-2 py-1.5 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-wide">
                        Seguir
                    </button>
                </div>
            </div>

            <p className="text-[10px] text-white/30 text-center max-w-[200px]">
                Tu video aparecerá en el feed con la etiqueta «Patrocinado».
            </p>
        </div>
    );
};

export default StepBoostPreview;
