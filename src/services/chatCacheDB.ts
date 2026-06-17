// IndexedDB cache para chats y mensajes — persiste entre sesiones sin internet

import { ChatRoom } from "../redux/reducers/message/listChatRoom";
import { Message } from "../redux/reducers/message/chatMeesage";

const DB_NAME = "buzzy_chat_cache";
const DB_VERSION = 3;
const STORE_CHATS = "chats";
const STORE_MESSAGES = "messages";
const STORE_STORIES = "stories";
const MAX_MESSAGES_PER_CHAT = 5;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS, { keyPath: "uuid" });
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: ["chat_uuid", "uuid"] });
        store.createIndex("by_chat", "chat_uuid");
      }
      if (!db.objectStoreNames.contains(STORE_STORIES)) {
        db.createObjectStore(STORE_STORIES, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Chats ---

export async function saveChatList(chats: ChatRoom[]): Promise<void> {
  if (!chats.length) return;
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_CHATS, "readwrite");
    const store = tx.objectStore(STORE_CHATS);
    for (const chat of chats) {
      store.put(chat);
    }
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

export async function loadChatList(): Promise<ChatRoom[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHATS, "readonly");
  const store = tx.objectStore(STORE_CHATS);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const chats: ChatRoom[] = req.result ?? [];
      // Ordenar por updated_at descendente (igual que el servidor)
      chats.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      resolve(chats);
    };
    req.onerror = () => reject(req.error);
  });
}

// --- Mensajes ---

export async function saveMessages(
  chat_uuid: string,
  messages: Message[]
): Promise<void> {
  if (!messages.length) return;

  // Step 1: load existing (read-only tx)
  const existing = await loadMessages(chat_uuid);
  const toKeep = [...existing, ...messages]
    .filter((m, i, arr) => arr.findIndex((x) => x.uuid === m.uuid) === i)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-MAX_MESSAGES_PER_CHAT);

  const db = await openDB();

  // Step 2: delete all old entries for this chat, wait for cursor to finish
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE_MESSAGES, "readwrite");
    const store = tx.objectStore(STORE_MESSAGES);
    if (store.indexNames.contains("by_chat")) {
      const req = store.index("by_chat").openCursor(IDBKeyRange.only(chat_uuid));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      req.onerror = () => rej(req.error);
    }
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });

  // Step 3: write fresh messages in a new transaction
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_MESSAGES, "readwrite");
    const store = tx.objectStore(STORE_MESSAGES);
    for (const msg of toKeep) {
      store.put({ ...msg, chat_uuid });
    }
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

// --- Stories ---

export async function saveStories(stories: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_STORIES, "readwrite");
    const store = tx.objectStore(STORE_STORIES);
    // Siempre reemplazamos el caché por la verdad del servidor: si llega vacío
    // (todas las historias expiraron a las 24h) el clear deja el store vacío.
    store.clear();
    for (const story of stories) {
      store.put(story);
    }
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

export async function clearStoriesCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_STORIES, "readwrite");
    tx.objectStore(STORE_STORIES).clear();
    return new Promise((res) => { tx.oncomplete = () => res(); tx.onerror = () => res(); });
  } catch { /* silent */ }
}

export async function loadStoriesCache(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STORIES, "readonly");
    const req = tx.objectStore(STORE_STORIES).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function loadMessages(chat_uuid: string): Promise<Message[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_MESSAGES, "readonly");
  const store = tx.objectStore(STORE_MESSAGES);

  return new Promise((resolve, reject) => {
    // Usar índice si existe, sino getAll y filtrar
    if (store.indexNames.contains("by_chat")) {
      const idx = store.index("by_chat");
      const req = idx.getAll(IDBKeyRange.only(chat_uuid));
      req.onsuccess = () => {
        const msgs: Message[] = req.result ?? [];
        msgs.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        resolve(msgs);
      };
      req.onerror = () => reject(req.error);
    } else {
      const req = store.getAll();
      req.onsuccess = () => {
        const msgs: Message[] = (req.result ?? []).filter(
          (m: any) => m.chat_uuid === chat_uuid
        );
        msgs.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        resolve(msgs);
      };
      req.onerror = () => reject(req.error);
    }
  });
}

export async function clearChatCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_CHATS, STORE_MESSAGES, STORE_STORIES], "readwrite");
    tx.objectStore(STORE_CHATS).clear();
    tx.objectStore(STORE_MESSAGES).clear();
    tx.objectStore(STORE_STORIES).clear();
    return new Promise((res) => { tx.oncomplete = () => res(); tx.onerror = () => res(); });
  } catch { /* silent */ }
}

