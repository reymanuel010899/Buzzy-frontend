// Re-firma de URLs de media vencidas (estilo TikTok).
//
// Los videos y la música se sirven con URLs FIRMADAS que caducan (TTL, ver
// media_signing.py). Si el usuario vuelve a la app tras varias horas, las URLs
// del feed cacheado (IndexedDB) ya vencieron → el servidor responde 403 y el
// reproductor queda en negro. En vez de mostrar ese error, pedimos al backend
// una versión RECIÉN firmada del video (GET /api/videos/<uuid>/ devuelve el
// serializer completo con `video` y `audio_track_url` frescos) y reintentamos.

import { apiClient } from "../redux/client/api-client";

export interface FreshUrls {
  video?: string | null;
  audio_track_url?: string | null;
}

// Cache en memoria por uuid para no machacar el backend si varios slides/eventos
// piden la re-firma del mismo video casi a la vez. La promesa se comparte mientras
// está en vuelo; al resolver se limpia para que un futuro 403 (si vuelve a vencer)
// pueda re-pedir.
const inflight = new Map<string, Promise<FreshUrls | null>>();

/**
 * Devuelve URLs recién firmadas para un video. `uuid` es el del video (el feed lo
 * trae como `video.uuid`). Devuelve null si falla (sin red, 404, etc.) — el caller
 * decide qué hacer (normalmente, dejar el frame como está).
 */
export async function fetchFreshMediaUrl(uuid: string): Promise<FreshUrls | null> {
  if (!uuid) return null;
  const existing = inflight.get(uuid);
  if (existing) return existing;

  const p = apiClient
    .get(`/api/videos/${uuid}/`)
    .then((res): FreshUrls | null => {
      const d = res?.data;
      if (!d) return null;
      return { video: d.video, audio_track_url: d.audio_track_url };
    })
    .catch(() => null)
    .finally(() => {
      // Liberar tras un breve margen: si la URL nueva también está por vencer,
      // permitir re-pedir. No la guardamos indefinidamente.
      setTimeout(() => inflight.delete(uuid), 1000);
    });

  inflight.set(uuid, p);
  return p;
}
