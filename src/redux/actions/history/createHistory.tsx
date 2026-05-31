// import apiClient from "../../client/api-client";
import {
  SUCCEES_CREATE_STORY,
  FAILED_CREATE_STORY
} from "../../type";
import { apiClientStory } from "../../client/api-client";


export const createStory = (data: FormData) => async (dispatch: any) => {
  try {
    const response = await apiClientStory.post(
      "/api/stories/create/",
      data
    );

    dispatch({
      type: SUCCEES_CREATE_STORY,
      payload: response.data,
    });
    return response.data
  } catch (error) {
    dispatch({
      type: FAILED_CREATE_STORY,
      payload: (error as any)?.message ?? 'error',
    });
  }
};
