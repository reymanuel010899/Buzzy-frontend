import axios from "axios";
import { SUCCEES_LOGIN, FAILED_LOGIN, LOGOUT_USER } from "../type";
import type { AppDispatch } from "../../store";
import { apiClient, getBaseUrl } from "../client/api-client";
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
export const logout = () => (dispatch: AppDispatch) => {
  clearAuthData();
  dispatch({ type: LOGOUT_USER });
  window.location.replace("/sign-in");
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
export const googleRegister = (accessToken: string, photoUrl?: string, countryCode?: string, countryName?: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post(
      "/api/google/register/",
      {
        access_token: accessToken,
        photo_url: photoUrl || null,
        country_code: countryCode || "US",
        country_name: countryName || "United States",
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
};

const persistAuthData = (response: { refresh: string; access: string; user: unknown }) => {
  localStorage.setItem("refreshToken", response.refresh);
  localStorage.setItem("accessToken", response.access);
  localStorage.setItem("isAuthenticated", "true");
  localStorage.setItem("user", JSON.stringify(response.user));
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
