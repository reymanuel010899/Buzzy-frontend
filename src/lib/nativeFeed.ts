// Utilidades COMPARTIDAS del feed nativo (ExoPlayer vía BuzzyVideoFeed).
//
// El feed de inicio (index.tsx) y el visor del perfil (profile.tsx) alimentan el mismo
// reproductor nativo. Ambos necesitan: (1) filtrar la lista a SOLO-videos en el orden
// que ve el ViewPager2, (2) construir las URLs absolutas, y (3) armar el payload de
// música de un item. Se extrae aquí para no duplicar la lógica y para que el perfil
// (cuyo tipo `VideoItem` tiene nombres distintos y campos de audio sin tipar) la reuse.

import { getMediaUrl } from "../redux/client/api-client";

// Payload de setMusic (mismo shape que espera el plugin nativo). trimStart/trimEnd en s.
export interface NativeMusicPayload {
  url: string;
  volumeMusic?: number;
  volumeOriginal?: number;
  trimStart?: number;
  trimEnd?: number;
}

/**
 * Filtra una lista de items a SOLO videos (sin imágenes, sin items sin `.video`), en el
 * mismo orden que verá el ViewPager2 nativo. El nativo indexa en ESTA lista, así que es
 * la fuente de verdad índice-nativo → item. Acepta `any` porque home y perfil usan tipos
 * distintos (Video vs VideoItem) con los mismos campos relevantes.
 */
export function filterVideoItems<T = any>(items: readonly T[] | null | undefined): T[] {
  return (items ?? []).filter((v: any) => v && v.media_type !== "image" && v.video);
}

/** URL absoluta reproducible de un item de video (respeta URLs que ya vienen con http). */
export function videoUrlOf(item: any): string {
  const src = item?.video ?? item?.video_url ?? "";
  return src.startsWith("http") ? src : getMediaUrl(src);
}

/** Lista de URLs absolutas para BuzzyVideoFeed.show/replaceUrls, a partir de items ya filtrados. */
export function buildExoUrls(videoItems: readonly any[]): string[] {
  return videoItems.map(videoUrlOf);
}

/**
 * Construye el payload de música para BuzzyVideoFeed.setMusic de un item. Si el item no
 * tiene pista (`audio_track_url`), devuelve `{ url: '' }` (silencia), conservando el
 * volumen original para que el video suene a su nivel. Lee los campos de audio de forma
 * tolerante (el perfil los tiene sin tipar).
 */
export function buildMusicPayload(item: any): NativeMusicPayload {
  const volumeOriginal = Math.min(Math.max(item?.volume_original ?? 1.0, 0), 1);
  if (!item || !item.audio_track_url) {
    return { url: "", volumeOriginal };
  }
  const trimStart = Math.max(0, item.audio_trim_start ?? 0);
  const trimEndRaw = item.audio_trim_end;
  // trimEnd válido solo si es un número > trimStart; si no, 0 = sin recorte final.
  const trimEnd =
    typeof trimEndRaw === "number" && isFinite(trimEndRaw) && trimEndRaw > trimStart
      ? trimEndRaw
      : 0;
  return {
    url: item.audio_track_url,
    volumeMusic: Math.min(Math.max(item.volume_music ?? 0.8, 0), 1),
    volumeOriginal,
    trimStart,
    trimEnd,
  };
}
