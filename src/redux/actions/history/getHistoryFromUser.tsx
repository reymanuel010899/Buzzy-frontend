import apiClient from "../../client/api-client";
import {
  SUCCEES_USER_STORIES,
  FAILED_USER_STORIES
} from "../../type";


export const getUserStories = (userId: number) => async (dispatch: any) => {
  try {
    const response = await apiClient.get(`video/api/stories/user/${userId}/`);
    dispatch({
      type: SUCCEES_USER_STORIES,
      payload: response.data,
    });
  } catch (error) {
    dispatch({
      type: FAILED_USER_STORIES,
      payload: error,
    });
  }
};
