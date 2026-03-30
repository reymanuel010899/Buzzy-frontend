import { SUCCEES_MEDIA, FAILED_MEDIA, APPEND_MEDIA } from '../type'
import { apiClient } from '../client/api-client';

export const getMedia = () => async (dispatch: any) => {
  try {
    const response = await apiClient.get('/api/list-home/')
    if (response.status === 200) {
      dispatch({
        type: SUCCEES_MEDIA,
        payload: response.data,
      });
    }

  } catch (error) {
    dispatch({
      type: FAILED_MEDIA,
      payload: ''
    });
  }
};

export const getRecommendedFeed = (userInterests: any, lastCursor: string | null) => async (dispatch: any) => {
  try {
    const response = await apiClient.get('/api/recommendations/feed/');
    if (response.status === 200) {
      dispatch({
        type: APPEND_MEDIA,
        payload: response.data,
      });
    }
    return response.data;
  } catch (error) {
    dispatch({
      type: FAILED_MEDIA,
      payload: 'Error fetching recommended feed'
    });
  }
};

