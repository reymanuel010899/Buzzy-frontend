import apiClient from "../../client/api-client";
import { FAILED_GET_ONE_ACTIVE_GIFTS, SUCCEES_GET_ONE_ACTIVE_GIFTS } from "../../type";


export const getOneActiveGift = (gift_uuid: string, story_uuid: string) => async (dispatch: any) => {
  try {
    const response = await apiClient.get(`media/api/stories/gift/get-one/active/${gift_uuid}/${story_uuid}/`);
    dispatch({
      type: SUCCEES_GET_ONE_ACTIVE_GIFTS,
      payload: response.data,
    });
    return response.data
  } catch (error) {
    dispatch({
      type: FAILED_GET_ONE_ACTIVE_GIFTS,
      payload: error,
    });
  }
};
