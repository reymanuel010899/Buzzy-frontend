import axios from "axios";
import { SUCCEES_LOGIN, FAILED_LOGIN } from "../type";

export interface fetchWithAuthProps {
  email: string;
  password: string;
}

export const login = (formData: fetchWithAuthProps) => async (dispatch: any) => {
    let accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      throw new Error("No access token found");
    }

    try {
      let response = await axios.post(
        'http://127.0.0.1:8000/api/login/',
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log(response, "888")
      if (response.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token found");
        }

        const refreshResponse = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
          method: "POST",
          body: JSON.stringify({ refresh: refreshToken }),
          headers: { "Content-Type": "application/json" },
        });

        if (refreshResponse.ok) {
          const { access } = await refreshResponse.json();
          localStorage.setItem("accessToken", access);
          return login(formData);
        } else {
            window.location.href = "/login";
        }
      } else if (response.status == 200) {
        confirm('eeee')
          localStorage.setItem('refreshToken', response.data.refresh)
          localStorage.setItem('accessToken', response.data.access)
          localStorage.setItem('user', JSON.stringify(response.data.user))
          dispatch({
            type: SUCCEES_LOGIN,
            payload: response.data
          })
      } else {
        dispatch({
          type: FAILED_LOGIN,
          payload: null
        })
      }
      
    } catch (error) {
      console.error("Error in fetchWithAuth:", error);
      throw error;
    }
};

