import { SUCCEES_MEDIA, FAILED_MEDIA } from '../type'
import apiClient from '../client/api-client';

export const getMedia = () => async (dispatch: any) => {
    try {
      const response = await apiClient.get('/media/api/list-home/')
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

