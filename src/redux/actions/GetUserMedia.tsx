import axios from 'axios'
import { SUCCEES_GET_MEDIA_USER, FAILED_GET_MEDIA_USER } from '../type'
// const user_seccion =  JSON.parse(localStorage.getItem('user') || '')

export const getUserMedia = (username=user_seccion.username) => async (dispatch: any) => {
    try {
        const response = await axios.get(`http://localhost:8000/api/get-media-user/${username}`, {
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
