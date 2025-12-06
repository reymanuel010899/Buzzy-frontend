import axios from "axios";

const API_URL = "http://127.0.0.1:8000/"; // tu backend

// Crear instancia
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Adjuntar token automáticamente
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: Manejo de errores global
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si el token expiró intentar refrescar
    if (error.response?.status === 401) {
      console.log("Token inválido / expirado");
      window.location.href = 'sign-in'
    }

    return Promise.reject(error);
  }
);

export default apiClient;
