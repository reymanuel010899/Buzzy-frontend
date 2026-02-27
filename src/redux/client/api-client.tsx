import axios from "axios";

export const getBaseUrl = (): string => {
  // @ts-ignore
  const runtimeUrl = window.__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL;

  if (runtimeUrl && !runtimeUrl.includes("NEXT_PUBLIC_BACKEND_URL")) {
    let url = runtimeUrl.trim();
    if (!url.startsWith("http")) url = `http://${url}`;
    return url.endsWith("/") ? url : `${url}/`;
  }

  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000/";
};

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
  return config;
});

// Interceptor de respuesta para apiClient
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log("Token inválido / expirado");
      if (typeof window !== "undefined") {
        window.location.href = '/sign-in';
      }
    }
    return Promise.reject(error);
  }
);