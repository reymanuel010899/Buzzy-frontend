// IndexedDB cache para el feed de videos y perfil propio — persiste entre sesiones sin internet

import { Video } from "../components/index/main.interface";

const DB_NAME = "buzzy_feed_cache";
const DB_VERSION = 2;
const STORE = "feed";
const STORE_PROFILE = "profile_videos";
const CACHE_KEY = "main_feed";
const MAX_VIDEOS = 20;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
      if (!db.objectStoreNames.contains(STORE_PROFILE)) {
        db.createObjectStore(STORE_PROFILE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Pre-carga las fotos de perfil de los videos en la Cache API del navegador
 * para que estén disponibles sin internet.
 * Falla silenciosamente si el browser no soporta Cache API o hay error de red.
 */
async function precacheProfilePictures(videos: Video[]): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open('buzzy-avatars-v1');
    const urls = videos
      .flatMap(v => [
        v.user_id?.profile_picture,
        v.thumbnail_url,
      ])
      .filter((url): url is string => typeof url === 'string' && url.startsWith('http'));
    console.log(urls, "********************")
    const unique = [...new Set(urls)];
    await Promise.allSettled(unique.map(url =>
      cache.match(url).then(hit => hit ? undefined : fetch(url).then(r => r.ok ? cache.put(url, r) : undefined).catch(() => {}))
    ));
  } catch {
    // best-effort — sin internet no hay nada que pre-cachear
  }
}

export async function saveFeed(videos: Video[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    // Guardar solo los primeros MAX_VIDEOS para no crecer indefinidamente
    tx.objectStore(STORE).put(videos.slice(0, MAX_VIDEOS), CACHE_KEY);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    // Pre-cachear fotos de perfil en paralelo con el guardado del feed
    precacheProfilePictures(videos);
  } catch {
    // fallo silencioso — el cache es best-effort
  }
}

export async function loadFeed(): Promise<Video[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE).get(CACHE_KEY);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// --- Videos del perfil propio ---
// Se usa un tipo genérico porque VideoItem del perfil es diferente a Video del feed

export async function saveProfileVideos(videos: object[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROFILE, "readwrite");
    tx.objectStore(STORE_PROFILE).put(videos.slice(0, MAX_VIDEOS), "own");
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    // fallo silencioso
  }
}

export async function loadProfileVideos(): Promise<object[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROFILE, "readonly");
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE_PROFILE).get("own");
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}
