import { apiClient } from "../../client/api-client";
import { FAILED_LIKE_STORY, SUCCEES_LIKE_STORY } from "../../type";


export const likeStory = (data: any) => async (dispatch: any) => {
  try {
    const response = await apiClient.post("/api/stories/like/", data);
    dispatch({
      type: SUCCEES_LIKE_STORY,
      payload: response.data,
    });
  } catch (error) {
    dispatch({
      type: FAILED_LIKE_STORY,
      payload: (error as any)?.message ?? 'error',
    });
  }
};
