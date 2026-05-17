import axios from 'axios'
import { SUCCEES_GET_MEDIA_USER, FAILED_GET_MEDIA_USER } from '../type'
// const user_seccion =  JSON.parse(localStorage.getItem('user') || '')
import type { AppDispatch } from "../../store";
import { getBaseUrl } from '../client/api-client'
// user_seccion?.username
export const getUserMedia = (username = "") => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.get(`${getBaseUrl()}api/get-media-user/${username}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    });
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
