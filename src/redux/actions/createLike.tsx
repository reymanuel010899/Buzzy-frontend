import { FAILED_CREATE_LIKE, SUCCEES_CREATE_LIKE } from '../type'
import { apiClient } from '../client/api-client';

type CreateLikeBody = {
  video_id: string;
};
export const createLike = (body: CreateLikeBody) => async (dispatch: any) => {
  try {
      const response = await apiClient.post('/api/create-like/', body);
    if (response.status === 200) {
      console.log("Like created successfully:", response.data);
      dispatch({
        type: SUCCEES_CREATE_LIKE,
        payload: response.data,
      });
    }

  } catch {
    dispatch({
      type: FAILED_CREATE_LIKE,
      payload: ''
    });
  }
};

