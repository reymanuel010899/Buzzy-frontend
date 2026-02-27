import { apiClient } from "../../client/api-client";
import {
  SUCCEES_DELETE_STORY,
  FAILED_DELETE_STORY
} from "../../type";

export const deleteStory = (uuid: string) => async (dispatch: any) => {
  try {
    const response = await apiClient.delete(`/api/stories/${uuid}/delete/`);
    dispatch({
      type: SUCCEES_DELETE_STORY,
      payload: response.data,
    });
  } catch (error) {
    dispatch({
      type: FAILED_DELETE_STORY,
      payload: error,
    });
  }
};
