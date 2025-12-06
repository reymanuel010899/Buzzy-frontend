import axios from 'axios'
import { SUCCEES_MEDIA, FAILED_MEDIA } from '../type'

export const getMeta = (formData: object) => async (dispatch: any) => {
  console.log("estoy aqui", formData)

    try {
        const response = await axios.post('http://localhost:8000/media/api/upload/', formData, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("accessToken")}`,
                'Content-Type': 'multipart/form-data',
            },
          });
        console.log(response)
      if (response.status === 200) {
        dispatch({
          type: SUCCEES_MEDIA,
          payload: response.data,
        });
      }
  
    } catch (error) {
      dispatch({
        type: FAILED_MEDIA,
        payload: ''
      });
    }
  };
