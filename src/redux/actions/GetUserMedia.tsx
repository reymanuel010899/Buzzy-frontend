import axios from 'axios'
import { SUCCEES_GET_MEDIA_USER, FAILED_GET_MEDIA_USER } from '../type'
// const user_seccion =  JSON.parse(localStorage.getItem('user') || '')
import type { AppDispatch } from "../../store"; 
// user_seccion?.username
export const getUserMedia = (username  = "" ) => async (dispatch: AppDispatch) => {
    try {
        const response = await axios.get(`${(typeof window !== "undefined" ? (window as any).__RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL : "") || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}/api/get-media-user/${username}/`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`
            }
        });
        console.log(response)
        if (response.status === 200) {
            dispatch({
            type: SUCCEES_GET_MEDIA_USER,
            payload: response.data.media_user,
            });
        }
  
    } catch {
      dispatch({
        type: FAILED_GET_MEDIA_USER,
        payload: ''
      });
    }
  };
