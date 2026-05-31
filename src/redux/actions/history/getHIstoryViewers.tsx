import { apiClient } from "../../client/api-client";
import { FAILED_STORY_VIEWERS, SUCCEES_STORY_VIEWERS } from "../../type";


export const getStoryViewers = (uuid: string) => async (dispatch: any) => {
  try {
    console.log(uuid)
    const response = await apiClient.get(`/api/stories/${uuid}/viewers/`);
    dispatch({
      type: SUCCEES_STORY_VIEWERS,
      payload: response.data,
    });
    return response.data
  } catch (error) {
    dispatch({
      type: FAILED_STORY_VIEWERS,
      payload: (error as any)?.message ?? 'error',
    });
  }
};
