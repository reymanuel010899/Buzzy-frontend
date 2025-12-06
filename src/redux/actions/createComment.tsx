import {  FAILED_CREATE_COMMENT, SUCCEES_CREATE_COMMENT } from '../type'
import apiClient from '../client/api-client';

type CreateCommentBody = {
  video_id: string;
  content: string;
};

export const createComment = (body: CreateCommentBody) => async (dispatch: any) => {
    try {
      const response = await apiClient.post('media/api/create-comment/', body);
      if (response.status === 200) {
        dispatch({
          type: SUCCEES_CREATE_COMMENT,
          payload: response.data,
        });
        return response.data;
      }
  
    } catch {
      dispatch({
        type: FAILED_CREATE_COMMENT,
        payload: ''
      });
    }
  };

