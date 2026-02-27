import { apiClient } from "../../client/api-client";
import { FAILED_VIEW_STORY, SUCCEES_VIEW_STORY } from "../../type";


export const viewStory = (data: any) => async (dispatch: any) => {
  try {
    const response = await apiClient.post("/api/stories/view/", data);
    dispatch({
      type: SUCCEES_VIEW_STORY,
      payload: response.data,
    });
  } catch (error) {
    dispatch({
      type: FAILED_VIEW_STORY,
      payload: error,
    });
  }
};
