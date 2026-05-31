import { GiftI } from "../../../interfaces/gift";
import { apiClient } from "../../client/api-client";
import { FAILED_ACTIVE_GIFTS, SUCCEES_ACTIVE_GIFTS } from "../../type";


export const getActiveGift = () => async (dispatch: any) => {
  try {
    const response = await apiClient.get<GiftI[]>("/api/stories/gift/active/");
    dispatch({
      type: SUCCEES_ACTIVE_GIFTS,
      payload: response.data,
    });
    return response
  } catch (error: any) {
    dispatch({
      type: FAILED_ACTIVE_GIFTS,
      payload: error?.message ?? 'error',
    });
  }
};
