import { SUCCEES_MEDIA, FAILED_MEDIA } from '../type'
import { apiClientStory } from '../client/api-client';

export const getMeta = (formData: object) => async (dispatch: any) => {
  try {
    const response = await apiClientStory.post('/api/upload/', formData);
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
