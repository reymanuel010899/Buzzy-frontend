import axios from "axios";
import { SUCCEES_LOGIN, FAILED_LOGIN } from "../type";

export interface fetchWithAuthProps {
  email: string;
  password: string;
}

export const login = (formData: fetchWithAuthProps) => async (dispatch: any) => {
  try {
    // Solicitud de login SIN Authorization header (login fresco)
    const response = await axios.post(
      "http://127.0.0.1:8000/api/login/",
      formData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      // Guardar tokens y datos del usuario
      localStorage.setItem("refreshToken", response.data.refresh);
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(response.data.user));

      dispatch({
        type: SUCCEES_LOGIN,
        payload: response.data,
      });
    } else {
      dispatch({
        type: FAILED_LOGIN,
        payload: null,
      });
    }
  } catch (error: any) {
    // Manejo de errores (incluye intento de refresco si es 401)
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(
            "http://127.0.0.1:8000/api/token/refresh/",
            { refresh: refreshToken },
            {
              headers: { "Content-Type": "application/json" },
            }
          );

          if (refreshResponse.status === 200) {
            const { access } = refreshResponse.data;
            localStorage.setItem("accessToken", access);
            // Reintentar el login con el nuevo accessToken
            return login(formData)(dispatch); // Llamada recursiva
          }
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          window.location.href = "/login"; // Redirigir si falla el refresco
        }
      } else {
        console.error("No refresh token available");
        dispatch({
          type: FAILED_LOGIN,
          payload: null,
        });
      }
    } else {
      console.error("Error in login:", error);
      dispatch({
        type: FAILED_LOGIN,
        payload: null,
      });
    }
  }
};
