import { SUCCEES_GET_MEDIA_USER, FAILED_GET_MEDIA_USER } from '../type'
import type { AppDispatch } from "../../store";
import { apiClient } from '../client/api-client'

export const getUserMedia = (username = "") => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.get(`/api/get-media-user/${username}/`);
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
