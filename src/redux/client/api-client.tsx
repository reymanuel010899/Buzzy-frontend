import axios from "axios";
import i18n from "@/i18n/config";

export const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_DOMAIN_SERVER || "http://127.0.0.1:8000";
  return url.endsWith("/") ? url : `${url}/`;
};

export const BASE_URL = getBaseUrl();

/**
 * Converts a media path from the backend into a full URL.
 * Handles both old format ("profile_pics/avatar.webp") and
 * new format ("/media/profile_pics/avatar.webp") without doubling /media/.
 */
export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return ""
  if (path.startsWith("http")) return path
  const base = getBaseUrl().replace(/\/+$/, "") // remove trailing slashes
  // normalize: remove leading slashes then re-add one
  const clean = path.replace(/^\/+/, "")
  if (clean.startsWith("media/")) {
    return `${base}/${clean}`
  }
  return `${base}/media/${clean}`
}

// 1. Exportación nombrada para apiClient
export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["Accept-Language"] = i18n.language || "en";
  return config;
});

// 2. Exportación nombrada para apiClientStory
// NOTA: Leer el localStorage aquí solo funcionará la primera vez que se cargue el archivo.
// Es mejor usar un interceptor para que el token siempre esté actualizado.
export const apiClientStory = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

// Interceptor para apiClientStory (Para que el token sea dinámico y no falle si cambia)
apiClientStory.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["Accept-Language"] = i18n.language || "en";
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const responseInterceptor = async (error: any) => {
  const originalRequest = error.config;

  if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
      try {
        const { data } = await axios.post(`${getBaseUrl()}api/token/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem("accessToken", data.access);
        if (data.refresh) localStorage.setItem("refreshToken", data.refresh);

        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        processQueue(null, data.access);
        return axios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("user");
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      if (typeof window !== "undefined") {
        window.location.href = "/sign-in";
      }
      return Promise.reject(error);
    }
  }

  return Promise.reject(error);
};

// Interceptor de respuesta para apiClient
apiClient.interceptors.response.use((response) => response, responseInterceptor);
apiClientStory.interceptors.response.use((response) => response, responseInterceptor);