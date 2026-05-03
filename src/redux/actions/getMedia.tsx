import { SUCCEES_MEDIA, FAILED_MEDIA, APPEND_MEDIA } from '../type'
import { apiClient } from '../client/api-client';

// list-home: top 20 videos populares para usuarios nuevos sin historial.
// El backend devuelve directamente un array de videos.
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

// feed: recomendaciones personalizadas. El backend devuelve { mode, results }.
// mode puede ser: 'cold_start' | 'warming_up' | 'personalized' | 'fallback'
export const getRecommendedFeed = () => async (dispatch: any) => {
  try {
    const response = await apiClient.get('/api/recommendations/feed/');
    if (response.status === 200) {
      const videos = response.data?.results ?? response.data;
      const mode: string = response.data?.mode ?? 'personalized';

      // Si el usuario ya tiene perfil personalizado, marcamos que ya vio videos
      if (mode === 'personalized' || mode === 'warming_up') {
        localStorage.setItem('seen_initial', 'true');
      }

      dispatch({
        type: APPEND_MEDIA,
        payload: videos,
      });
      return videos;
    }
  } catch {
    dispatch({
      type: FAILED_MEDIA,
      payload: 'Error fetching recommended feed'
    });
  }
};
