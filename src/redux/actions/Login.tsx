import axios from "axios";
import { SUCCEES_LOGIN, FAILED_LOGIN } from "../type";

import type { AppDispatch } from "../../store"; 
export interface FetchWithAuthProps {
  email: string;
  password: string;
}

// Función de login
export const login = (formData: FetchWithAuthProps) => async (dispatch: AppDispatch) => {
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
      clearAuthData();
      dispatch({ type: FAILED_LOGIN, payload: null });
    }
  } catch (error: unknown) {
    handleLoginError(error, formData, dispatch);
  }
};


const clearAuthData = () => {
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("user");
};

const handleLoginError = async (error: unknown, formData: FetchWithAuthProps, dispatch: AppDispatch) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
      try {
        const refreshResponse = await axios.post(
          "http://127.0.0.1:8000/api/token/refresh/",
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
        window.location.href = "/login";
      }
    } else {
      console.error("No refresh token available");
      dispatch({ type: FAILED_LOGIN, payload: null });
    }
  } else {
    console.error("Error in login:", error);
    dispatch({ type: FAILED_LOGIN, payload: null });
  }
};
