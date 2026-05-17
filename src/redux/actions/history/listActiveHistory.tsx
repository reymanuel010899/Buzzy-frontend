import { apiClient } from "../../client/api-client";
import { FAILED_ACTIVE_STORIES, SUCCEES_ACTIVE_STORIES } from "../../type";


export const getActiveStories = () => async (dispatch: any) => {
  try {
    const response = await apiClient.get("/api/stories/active/");
    dispatch({
      type: SUCCEES_ACTIVE_STORIES,
      payload: response.data,
    });
    return response.data
  } catch (error) {
    dispatch({
      type: FAILED_ACTIVE_STORIES,
      payload: error,
    });
  }
};
