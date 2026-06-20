import { SUCCEES_GET_USER, FAILED_GET_USER, USER_NOT_FOUND, CLEAR_USER } from '../type'
import { apiClient } from '../client/api-client';

const USER_CACHE_KEY = (username: string) => `buzzy_user_${username}`;

export const clearUser = () => ({ type: CLEAR_USER });

export const getUser = (username = '') => async (dispatch: any) => {
  // Stale-while-revalidate: pintar el cache local de inmediato para quitar el
  // skeleton al instante si el perfil ya se vio antes. Luego el servidor manda.
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY(username));
    if (cached) {
      const data = JSON.parse(cached);
      if (!data?.user?.is_owner) {
        dispatch({ type: SUCCEES_GET_USER, payload: { ...data, _fromCache: true } });
      }
    }
  } catch { /* cache inválido */ }

  try {
    const response = await apiClient.get(`/api/get-user/${username}/`);
    const data = response.data;

    if (data?.user?.is_owner) {
      dispatch({
        type: USER_NOT_FOUND,
        payload: { user: data.user, searchedUsername: username },
      });
    } else {
      // Cachear datos del usuario para uso offline
      try { localStorage.setItem(USER_CACHE_KEY(username), JSON.stringify(data)); } catch { /* cuota llena */ }
      dispatch({ type: SUCCEES_GET_USER, payload: data });
    }
  } catch (error: any) {
    // Sin internet: intentar cargar del cache local
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY(username));
      if (cached) {
        const data = JSON.parse(cached);
        dispatch({ type: SUCCEES_GET_USER, payload: { ...data, _fromCache: true } });
        return;
      }
    } catch { /* cache inválido */ }
    dispatch({ type: FAILED_GET_USER, payload: (error as any)?.message ?? 'error' });
  }
};
