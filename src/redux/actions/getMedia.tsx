import { SUCCEES_MEDIA, FAILED_MEDIA, APPEND_MEDIA, RESET_MEDIA } from '../type'
import { apiClient } from '../client/api-client';
import { saveFeed, loadFeed } from '../../services/feedCacheDB';

// Guard global para evitar doble llamada al feed (re-mount de redux-persist, StrictMode, etc.)
let _feedFetchInFlight = false;

// list-home: top 20 videos populares para usuarios nuevos sin historial.
export const getMedia = () => async (dispatch: (a: unknown) => void) => {
  // Mostrar cache primero mientras llega el servidor
  try {
    const cached = await loadFeed();
    if (cached.length > 0) {
      dispatch({ type: APPEND_MEDIA, payload: cached });
    }
  } catch { /* fallo silencioso */ }

  try {
    const response = await apiClient.get('/api/list-home/')
    if (response.status === 200) {
      dispatch({
        type: SUCCEES_MEDIA,
        payload: response.data,
      });
      localStorage.setItem('seen_initial', 'true');
      saveFeed(response.data).catch(() => {});
    }
  } catch {
    dispatch({
      type: FAILED_MEDIA,
      payload: 'offline'
    });
  }
};

export const refreshFeed = () => async (dispatch: (a: unknown) => void) => {
  _feedFetchInFlight = false; // reset guard para permitir refresh manual
  dispatch({ type: RESET_MEDIA });
  return dispatch(getRecommendedFeed(true));
};

// feed: recomendaciones personalizadas.
export const getRecommendedFeed = (forceRefresh = false) => async (dispatch: (a: unknown) => void) => {
  // Evitar doble llamada simultánea al servidor (re-mount, StrictMode, etc.)
  if (_feedFetchInFlight && !forceRefresh) return;
  _feedFetchInFlight = true;

  // 1. Mostrar cache de IndexedDB inmediatamente mientras llega el servidor
  try {
    const cached = await loadFeed();
    if (cached.length > 0) {
      dispatch({ type: APPEND_MEDIA, payload: cached });
    }
  } catch {
    // fallo silencioso
  }

  // 2. Siempre llamar al servidor — con o sin cache previo
  try {
    const response = await apiClient.get('/api/recommendations/feed/');
    if (response.status === 200) {
      const videos = response.data?.results ?? response.data;
      const mode: string = response.data?.mode ?? 'personalized';

      if (mode === 'personalized' || mode === 'warming_up') {
        localStorage.setItem('seen_initial', 'true');
      }

      // Reemplaza el cache con datos frescos del servidor
      dispatch({ type: SUCCEES_MEDIA, payload: videos });

      // Actualizar IndexedDB con los videos frescos para la próxima vez offline
      saveFeed(videos).catch(() => {});

      return videos;
    }
  } catch {
    // Sin internet: el cache de IndexedDB ya fue despachado arriba
    dispatch({ type: FAILED_MEDIA, payload: 'offline' });
  } finally {
    // Liberar el guard después de 3s para permitir refreshes manuales
    setTimeout(() => { _feedFetchInFlight = false; }, 3000);
  }
};

// loadMoreFeed: paginación por scroll infinito.
// A diferencia de getRecommendedFeed (REPLACE vía SUCCEES_MEDIA), esta AGREGA
// los videos nuevos al final con APPEND_MEDIA — el reducer ya deduplica por id.
// El backend excluye los ya vistos (Redis seen:{user}), así que cada página trae
// videos distintos y la lista crece sin reiniciarse ni repetir contenido.
export const loadMoreFeed = () => async (dispatch: (a: unknown) => void) => {
  // Evitar doble llamada simultánea (re-mount, StrictMode, scroll rápido)
  if (_feedFetchInFlight) return;
  _feedFetchInFlight = true;

  try {
    const response = await apiClient.get('/api/recommendations/feed/');
    if (response.status === 200) {
      const videos = response.data?.results ?? response.data;

      // AGREGA al final en vez de reemplazar — el reducer deduplica por id
      dispatch({ type: APPEND_MEDIA, payload: videos });

      // No tocamos el cache de IndexedDB aquí: su cap de 20 es solo para el
      // cold-start offline, no para la lista viva paginada.
      return videos;
    }
  } catch {
    // Sin internet: no despachamos FAILED_MEDIA para no borrar el feed actual;
    // el usuario simplemente no recibe más páginas hasta recuperar conexión.
  } finally {
    setTimeout(() => { _feedFetchInFlight = false; }, 3000);
  }
};
