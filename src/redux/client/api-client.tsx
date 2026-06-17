import axios from "axios";
import i18n from "@/i18n/config";
import { router } from "../../router/index";

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      VITE_DOMAIN_SERVER?: string;
    };
  }
}

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

const normalizeBaseUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const rawUrl = value.trim();
  if (!rawUrl) return null;

  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;

  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return null;
  }
};

export const getBaseUrl = (): string => {
  const viteUrl = normalizeBaseUrl(import.meta.env.VITE_DOMAIN_SERVER);
  const runtimeUrl = normalizeBaseUrl(
    typeof window !== "undefined" ? window.__RUNTIME_CONFIG__?.VITE_DOMAIN_SERVER : undefined
  );
  // normalizeBaseUrl returns URL.origin (no trailing slash). Most call sites
  // concatenate paths directly as `${getBaseUrl()}api/...`, so we MUST return a
  // trailing slash here — otherwise the result is e.g. "http://host:8000api/..."
  // which throws "Failed to construct 'URL': Invalid URL".
  const base = viteUrl || runtimeUrl || DEFAULT_BASE_URL;
  return base.endsWith("/") ? base : `${base}/`;
};

export const BASE_URL = getBaseUrl();

export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path || typeof path !== 'string') return ""
  if (path.startsWith("http")) return path
  const base = getBaseUrl().replace(/\/+$/, "")
  const clean = path.replace(/^\/+/, "")
  if (clean.startsWith("media/")) {
    return `${base}/${clean}`
  }
  return `${base}/media/${clean}`
}

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

export const apiClientStory = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

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
        router.navigate("/sign-in", { replace: true });
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      router.navigate("/sign-in", { replace: true });
      return Promise.reject(error);
    }
  }

  return Promise.reject(error);
};

apiClient.interceptors.response.use((response) => response, responseInterceptor);
apiClientStory.interceptors.response.use((response) => response, responseInterceptor);
