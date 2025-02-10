import axios from 'axios'
import { IDataSignUp } from '../../componets/auth/auth.interface';
import { SUCCEES_MEDIA, FAILED_MEDIA } from '../type'

export const getMedia = () => async (dispatch: any) => {
    try {
      const response = await axios.get('http://localhost:8000/media/api/list-home/')
      console.log(response, "**********")
      if (response.status == 201) {
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

