import { SUCCEES_GET_COMMENT, FAILED_GET_COMMENT } from '../type'
import apiClient from '../client/api-client';
type GetCommentParams = {
  video_id: string;
};
export const getComment = ({video_id}: GetCommentParams) => async (dispatch: any) => {
    try {
      const response = await apiClient.get(`/media/api/get-comments/${video_id}/`)
      if (response.status === 200) {
        dispatch({
          type: SUCCEES_GET_COMMENT,
          payload: response.data,
        });
        return response.data || [];
      }
  
    } catch {
      dispatch({
        type: FAILED_GET_COMMENT,
        payload: ''
      });
    }
  };


