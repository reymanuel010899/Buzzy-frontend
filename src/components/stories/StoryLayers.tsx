import React from "react";
import { MapPin } from "lucide-react";
import { StoryTextLayer, StoryStickerLayer } from "../index/main.interface";
import { getMediaUrl } from "../../redux/client/api-client";

// Acorta una etiqueta de ubicación al primer segmento, recortando si es muy larga.
const shortLocationLabel = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const mainPart = trimmed.split(",")[0]?.trim() || trimmed;
  if (mainPart.length <= 22) return mainPart;
  return `${mainPart.slice(0, 21).trimEnd()}…`;
};

interface StoryLayersProps {
  textLayers?: StoryTextLayer[];
  stickerLayers?: StoryStickerLayer[];
  /** Ubicación de respaldo si un sticker de ubicación no trae texto propio. */
  storyLocation?: string | null;
  /** Click en un sticker de ubicación (p.ej. abrir mapa). Si no se pasa, no es interactivo. */
  onLocationClick?: (label: string) => void;
}

/**
 * Capas de una historia (texto + stickers) superpuestas sobre la media base.
 * Componente compartido por el visor del feed, el del perfil y el del chat para
 * que los tres rendericen exactamente lo mismo y no diverjan.
 */
const StoryLayers: React.FC<StoryLayersProps> = ({
  textLayers = [],
  stickerLayers = [],
  storyLocation = null,
  onLocationClick,
}) => {
  return (
    <>
      {textLayers.map((layer) => (
        <div
          key={layer.id}
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="whitespace-pre-wrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
            style={{
              color: layer.color,
              fontSize: `${layer.fontSize}px`,
              fontWeight: layer.bold ? 900 : 600,
              textShadow: "0 2px 6px rgba(0,0,0,0.9)",
            }}
          >
            {layer.text}
          </span>
        </div>
      ))}

      {stickerLayers.map((layer) => {
        const isLocation = layer.kind === "location" && !!layer.text;
        const stickerSrc = layer.src
          ? layer.src.startsWith("http")
            ? layer.src
            : getMediaUrl(layer.src)
          : "";
        const isImage = layer.kind === "image" && !!stickerSrc;
        const isVideo = layer.kind === "video" && !!stickerSrc;
        const rotation = layer.rotation ?? 0;
        return (
          <div
            key={layer.id}
            className={`absolute z-20 select-none ${
              isLocation && onLocationClick
                ? "pointer-events-auto cursor-pointer"
                : "pointer-events-none"
            }`}
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            }}
            onClick={(e) => {
              if (!isLocation || !onLocationClick) return;
              e.stopPropagation();
              onLocationClick(layer.text || storyLocation || "");
            }}
          >
            {isLocation ? (
              <div className="inline-flex max-w-[250px] items-center gap-2 rounded-[22px] border border-white/15 bg-[rgba(10,10,16,0.72)] px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 text-white shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                  <MapPin size={14} />
                  <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-white/90 ring-2 ring-black/35" />
                </div>
                <div className="min-w-0 flex flex-col text-left">
                  <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/55">
                    Ubicación
                  </span>
                  <span
                    className="truncate font-black uppercase tracking-wide text-white"
                    style={{ fontSize: "12px" }}
                  >
                    {shortLocationLabel(layer.text || storyLocation || "")}
                  </span>
                </div>
                <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/70">
                  <span className="text-[10px] font-black">›</span>
                </div>
              </div>
            ) : isVideo ? (
              <video
                src={stickerSrc}
                autoPlay
                loop
                playsInline
                className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] rounded-lg"
                style={{
                  width: `${layer.size * 1.4}px`,
                  height: "auto",
                  maxHeight: `${layer.size * 2.5}px`,
                }}
                draggable={false}
              />
            ) : isImage ? (
              <img
                src={stickerSrc}
                alt="Sticker"
                className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
                style={{ width: `${layer.size * 1.4}px`, height: "auto" }}
                draggable={false}
              />
            ) : (
              <span style={{ fontSize: `${layer.size}px` }}>{layer.emoji}</span>
            )}
          </div>
        );
      })}
    </>
  );
};

export default StoryLayers;
