import apiClient from "../../client/api-client";
import {  FAILED_RECEVED_GIFTS, SUCCEES_RECIVED_GIFTS } from "../../type";


export const getRecivedGift = (story_id: string | null) => async (dispatch: any) => {
  try {
    const response = await apiClient.get(`media/api/stories/gift/recived/${story_id}/`);
    dispatch({
      type: SUCCEES_RECIVED_GIFTS,
      payload: response.data,
    });
    return response.data
  } catch (error) {
    dispatch({
      type: FAILED_RECEVED_GIFTS,
      payload: error,
    });
  }
};
