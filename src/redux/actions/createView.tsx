import { FAILED_CREATE_VIEW, SUCCEES_CREATE_VIEW } from '../type'
import { apiClient } from '../client/api-client';

type CreateLikeBody = {
  video_id: string;
};
export const createView = (body: CreateLikeBody) => async (dispatch: any) => {
  try {
      const response = await apiClient.post('/api/create-view/', body);
    if (response.status === 200) {
      dispatch({
        type: SUCCEES_CREATE_VIEW,
        payload: response.data,
      });
    }

  } catch {
    dispatch({
      type: FAILED_CREATE_VIEW,
      payload: ''
    });
  }
};

