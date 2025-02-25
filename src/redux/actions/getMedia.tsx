import axios from 'axios'
import { SUCCEES_MEDIA, FAILED_MEDIA } from '../type'

export const getMedia = () => async (dispatch: any) => {
    try {
      const response = await axios.get('http://localhost:8000/media/api/list-home/')
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

