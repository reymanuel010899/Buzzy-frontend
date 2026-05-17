import { FAILED_CREATE_FOLLOWER, SUCCEES_CREATE_FOLLOWER } from '../type'
import { apiClient } from '../client/api-client';

type CreateLikeBody = {
  follower_user_id: string;
};
export const createFollower = (body: CreateLikeBody) => async (dispatch: any) => {
  try {
      const response = await apiClient.post('/api/create-follower/', body);
    if (response.status === 200) {
      console.log("follower created successfully:", response.data);
      dispatch({
        type: SUCCEES_CREATE_FOLLOWER,
        payload: response.data,
      });
    }
    return response

  } catch {
    dispatch({
      type: FAILED_CREATE_FOLLOWER,
      payload: ''
    });
  }
};

