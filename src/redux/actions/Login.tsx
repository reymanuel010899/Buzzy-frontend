import axios from "axios";
import { SUCCEES_LOGIN, FAILED_LOGIN, LOGOUT_USER, UPDATE_USER } from "../type";
import type { AppDispatch } from "../../store";
import { persistor } from "../../store";
import { apiClient, getBaseUrl } from "../client/api-client";
import { clearFeedCache } from "../../services/feedCacheDB";
import { clearChatCache } from "../../services/chatCacheDB";
export interface FetchWithAuthProps {
  email: string;
  password: string;
}

// Función de login
export const login = (formData: FetchWithAuthProps) => async (dispatch: AppDispatch): Promise<void> => {
  try {
    // Solicitud de login SIN Authorization header (login fresco)
    const response = await apiClient.post(
      "/api/login/",
      formData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      persistAuthData(response.data);
      dispatch({
        type: SUCCEES_LOGIN,
        payload: response.data,
      });
    } else {
      clearAuthData();
      dispatch({ type: FAILED_LOGIN, payload: null });
    }
  } catch (error: unknown) {
    return handleLoginError(error, formData, dispatch);
  }
};

// Función de Logout
// Claves de localStorage que se CONSERVAN tras el logout (no son datos del usuario).
const LOGOUT_PRESERVE_KEYS = ["buzzy_language"];

export const logout = () => (dispatch: AppDispatch) => {
  clearAuthData();
  dispatch({ type: LOGOUT_USER });

  // Limpieza TOTAL: nada del usuario anterior debe sobrevivir en el dispositivo.

  // 1. localStorage — borrar todo menos las claves preservadas (idioma).
  const clearLocalStorage = () => {
    try {
      const preserved: Record<string, string> = {};
      for (const key of LOGOUT_PRESERVE_KEYS) {
        const v = localStorage.getItem(key);
        if (v !== null) preserved[key] = v;
      }
      localStorage.clear();
      for (const [key, value] of Object.entries(preserved)) {
        localStorage.setItem(key, value);
      }
    } catch { /* ignore */ }
  };

  // 2. sessionStorage — borrar todo.
  const clearSessionStorage = () => {
    try { sessionStorage.clear(); } catch { /* ignore */ }
  };

  // 3. Cache API — borrar TODOS los buckets (avatares, audio, etc.).
  const clearCacheApi = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  };

  // 4. IndexedDB — borrar las BASES DE DATOS ENTERAS (no solo sus stores), así
  //    nada queda dentro (p.ej. el feed cacheado en buzzy_feed_cache → main_feed).
  const clearIndexedDB = async () => {
    if (!('indexedDB' in window)) return;
    const deleteDB = (name: string) => new Promise<void>((resolve) => {
      try {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      } catch { resolve(); }
    });
    let names: string[] = ["buzzy_feed_cache", "buzzy_chat_cache"];
    // Si el navegador soporta databases(), borrar TODAS las que existan.
    try {
      const idbAny = indexedDB as unknown as { databases?: () => Promise<{ name?: string }[]> };
      if (typeof idbAny.databases === 'function') {
        const dbs = await idbAny.databases();
        const found = dbs.map(d => d.name).filter((n): n is string => !!n);
        if (found.length) names = Array.from(new Set([...names, ...found]));
      }
    } catch { /* fallback a la lista fija */ }
    await Promise.all(names.map(deleteDB));
  };

  clearLocalStorage();
  clearSessionStorage();

  // Esperar a que TODA la limpieza asíncrona termine antes de recargar, para que
  // la recarga no aborte un borrado a medias (causa de que el feed sobreviviera).
  Promise.allSettled([
    persistor.purge(),
    clearIndexedDB(),
    clearCacheApi(),
  ]).finally(() => {
    window.location.replace("/sign-in");
  });
};

// Función de login con Google
export const googleLogin = (accessToken: string, photoUrl?: string, countryCode?: string, countryName?: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post(
      "/api/google/login/",
      {
        access_token: accessToken,
        photo_url: photoUrl || null,
        country_code: countryCode || 'US',
        country_name: countryName || 'United States'
      },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status === 200) {
      persistAuthData(response.data);
      dispatch({
        type: SUCCEES_LOGIN,
        payload: response.data,
      });
    } else {
      clearAuthData();
      dispatch({ type: FAILED_LOGIN, payload: null });
    }
  } catch (error: unknown) {
    clearAuthData();
    dispatch({ type: FAILED_LOGIN, payload: null });
    throw error; // propagate so caller can inspect status/code
  }
};

// Función de registro con Google
export const googleRegister = (accessToken: string, photoUrl?: string, countryCode?: string, countryName?: string, referralCode?: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post(
      "/api/google/register/",
      {
        access_token: accessToken,
        photo_url: photoUrl || null,
        country_code: countryCode || "US",
        country_name: countryName || "United States",
        ...(referralCode ? { referral_code: referralCode } : {}),
      },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status === 201) {
      persistAuthData(response.data);
      dispatch({
        type: SUCCEES_LOGIN,
        payload: response.data,
      });
    } else {
      clearAuthData();
      dispatch({ type: FAILED_LOGIN, payload: null });
    }
  } catch (error: unknown) {
    clearAuthData();
    dispatch({ type: FAILED_LOGIN, payload: null });
    throw error;
  }
};



const clearAuthData = () => {
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("user");
  localStorage.removeItem("seen_initial");
  // Clear app icon badge on logout
  import("@capawesome/capacitor-badge").then(({ Badge }) => Badge.set({ count: 0 }).catch(() => {}));
};

const persistAuthData = (response: { refresh: string; access: string; user: unknown }) => {
  localStorage.setItem("refreshToken", response.refresh);
  localStorage.setItem("accessToken", response.access);
  localStorage.setItem("isAuthenticated", "true");
  localStorage.setItem("user", JSON.stringify(response.user));
  // Belt-and-suspenders: a fresh login MUST start with a clean feed. If a previous
  // logout's cache purge didn't finish (timing/redirect), this guarantees the new
  // session never shows the old user's cached videos. seen_initial is reset so the
  // feed is fetched fresh from the server, not served from a stale cache.
  localStorage.removeItem("seen_initial");
  clearFeedCache().catch(() => {});
  clearChatCache().catch(() => {});
};

const handleLoginError = async (error: unknown, formData: FetchWithAuthProps, dispatch: AppDispatch): Promise<void> => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
      try {
        const refreshResponse = await axios.post(
          `${getBaseUrl()}api/token/refresh/`,
          { refresh: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        if (refreshResponse.status === 200) {
          const { access } = refreshResponse.data;
          localStorage.setItem("accessToken", access);
          return login(formData)(dispatch);
        }
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        if (window.location.pathname !== "/sign-in") {
          window.location.href = "/sign-in";
        }
      }
    } else {
      console.error("No refresh token available");
      dispatch({ type: FAILED_LOGIN, payload: null });
      if (window.location.pathname !== "/sign-in") {
        window.location.href = "/sign-in";
      }
    }
  } else {
    console.error("Error in login:", error);
    dispatch({ type: FAILED_LOGIN, payload: null });
  }
  throw error;
};

/**
 * Refresca el perfil del usuario autenticado desde la API al iniciar la app.
 * Evita que se muestren imágenes rotas o datos stale del localStorage.
 * Si no hay internet, usa silenciosamente los datos del localStorage.
 */
export const refreshSession = () => async (dispatch: AppDispatch): Promise<void> => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return;

    const storedUser = JSON.parse(stored);
    const username = storedUser?.username;
    if (!username) return;

    const response = await apiClient.get(`/api/get-user/${username}/`);
    if (response.status === 200) {
      const freshUser = response.data;
      // Actualizar Redux con datos frescos
      dispatch({ type: UPDATE_USER, payload: { user: freshUser } });
      // Sincronizar localStorage para la próxima sesión offline
      localStorage.setItem("user", JSON.stringify({ ...storedUser, ...freshUser }));
    }
  } catch {
    // Sin internet o token expirado: los datos del localStorage siguen en Redux, no hacer nada
  }
};
