import { SUCCESS_GET_BANNER, FAILED_GET_BANNER, DISMISS_BANNER } from '../type';
import { apiClient } from '../client/api-client';

export const fetchActiveBanner = () => async (dispatch: any) => {
  try {
    const response = await apiClient.get('/api/banners/me/');
    dispatch({ type: SUCCESS_GET_BANNER, payload: response.data.banner });
  } catch {
    dispatch({ type: FAILED_GET_BANNER });
  }
};

export const dismissBanner = (bannerId: number) => async (dispatch: any) => {
  try {
    await apiClient.post('/api/banners/me/', { banner_id: bannerId });
    dispatch({ type: DISMISS_BANNER });
  } catch {
    dispatch({ type: DISMISS_BANNER });
  }
};
