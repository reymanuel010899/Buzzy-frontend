import { SUCCEES_MEDIA, FAILED_MEDIA } from '../type'
import { apiClientStory } from '../client/api-client';

export const getMeta = (formData: object) => async (dispatch: any) => {
  console.log("estoy aqui", formData)

  try {
    const response = await apiClientStory.post('/api/upload/', formData);
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
