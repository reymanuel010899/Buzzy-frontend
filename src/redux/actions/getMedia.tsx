import { SUCCEES_MEDIA, FAILED_MEDIA, APPEND_MEDIA, RESET_MEDIA } from '../type'
import { apiClient } from '../client/api-client';
import { saveFeed, loadFeed } from '../../services/feedCacheDB';

// Guard global para evitar doble llamada al feed (re-mount de redux-persist, StrictMode, etc.)
let _feedFetchInFlight = false;

// list-home: top 20 videos populares para usuarios nuevos sin historial.
export const getMedia = () => async (dispatch: (a: unknown) => void) => {
  // El cache SOLO se muestra cuando NO hay internet. Con conexión siempre pedimos
  // videos frescos al servidor — así al iniciar sesión nunca ves los que ya
  // viste. Offline: mostramos el cache para que la app no quede en blanco.
  if (!navigator.onLine) {
    try {
      const cached = await loadFeed();
      if (cached.length > 0) {
        dispatch({ type: APPEND_MEDIA, payload: cached });
      }
    } catch { /* fallo silencioso */ }
  }

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
    // La petición falló. Mostrar cache SOLO si realmente estamos offline (las URLs
    // firmadas cacheadas vencen tras horas → 403). Online: mejor reintentar que
    // pintar URLs vencidas; el reproductor nativo re-firma vía 'playerError'.
    if (!navigator.onLine) {
      try {
        const cached = await loadFeed();
        if (cached.length > 0) {
          dispatch({ type: APPEND_MEDIA, payload: cached });
        }
      } catch { /* fallo silencioso */ }
    }
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

  // 1. El cache SOLO se muestra si NO hay internet. Con conexión vamos directo al
  //    servidor para traer videos frescos (no los que el usuario ya vio).
  if (!navigator.onLine) {
    try {
      const cached = await loadFeed();
      if (cached.length > 0) {
        dispatch({ type: APPEND_MEDIA, payload: cached });
      }
    } catch {
      // fallo silencioso
    }
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
    // La petición falló. Mostrar el cache SOLO si realmente estamos offline: las
    // URLs cacheadas están firmadas y, tras horas, vencen (403). Si hay internet
    // pero la petición falló transitoriamente, NO inundamos el feed con URLs
    // vencidas — es mejor un feed vacío que reintenta. (El reproductor nativo, si
    // igual recibe una URL vencida, la re-firma vía el evento 'playerError'.)
    if (!navigator.onLine) {
      try {
        const cached = await loadFeed();
        if (cached.length > 0) {
          dispatch({ type: APPEND_MEDIA, payload: cached });
        }
      } catch { /* fallo silencioso */ }
    }
    dispatch({ type: FAILED_MEDIA, payload: 'offline' });
  } finally {
    // Carga de reemplazo (no paginación): libera la guarda de inmediato para no
    // bloquear un cambio de tab inmediato hacia el feed de seguidos.
    _feedFetchInFlight = false;
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

// ─── Feed de seguidos (tab "Seguidos") ───────────────────────────────────────
// Timeline cronológico de las cuentas que el usuario sigue.
// No usa el cache de IndexedDB (ese es solo para el cold-start de "Para ti").

// getFollowingFeed: primera carga del tab Seguidos. REEMPLAZA el feed actual.
// `force` ignora la guarda: un cambio de tab es intención explícita del usuario
// y debe poder reemplazar cualquier carga del otro feed que esté en vuelo.
export const getFollowingFeed = (force = false) => async (dispatch: (a: unknown) => void) => {
  if (_feedFetchInFlight && !force) return;
  _feedFetchInFlight = true;

  // Cambio de tab (force): limpia el feed anterior para no mostrar los videos de
  // "Para ti" mientras llega la respuesta de seguidos.
  if (force) dispatch({ type: RESET_MEDIA });

  try {
    const response = await apiClient.get('/api/recommendations/following/');
    if (response.status === 200) {
      const videos = response.data?.results ?? response.data;
      dispatch({ type: SUCCEES_MEDIA, payload: videos });
      return videos;
    }
  } catch {
    dispatch({ type: FAILED_MEDIA, payload: 'offline' });
  } finally {
    // Carga de reemplazo (no paginación): libera la guarda de inmediato para no
    // bloquear un cambio de tab inmediato hacia el otro feed.
    _feedFetchInFlight = false;
  }
};

// loadMoreFollowingFeed: paginación por scroll del tab Seguidos. AGREGA al final.
export const loadMoreFollowingFeed = () => async (dispatch: (a: unknown) => void) => {
  if (_feedFetchInFlight) return;
  _feedFetchInFlight = true;

  try {
    const response = await apiClient.get('/api/recommendations/following/');
    if (response.status === 200) {
      const videos = response.data?.results ?? response.data;
      dispatch({ type: APPEND_MEDIA, payload: videos });
      return videos;
    }
  } catch {
    // Sin internet: mantenemos el feed actual.
  } finally {
    setTimeout(() => { _feedFetchInFlight = false; }, 3000);
  }
};
