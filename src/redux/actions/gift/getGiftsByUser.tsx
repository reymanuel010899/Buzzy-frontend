import apiClient from "../../client/api-client";
import { FAILED_RECEVED_GIFTS_BY_USER,  SUCCEES_RECIVED_GIFTS_BY_USER } from "../../type";


export const getRecivedGiftByUser = (story_id: string | null) => async (dispatch: any) => {
  try {
    const response = await apiClient.get(`media/api/stories/gift/recived/${story_id}/by-user/`);
    dispatch({
      type: SUCCEES_RECIVED_GIFTS_BY_USER,
      payload: response.data,
    });
    return response.data
  } catch (error) {
    dispatch({
      type: FAILED_RECEVED_GIFTS_BY_USER,
      payload: error,
    });
  }
};
