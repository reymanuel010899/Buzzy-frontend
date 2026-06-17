import { apiClient } from "../../client/api-client";
import { FAILED_ACTIVE_STORIES, SUCCEES_ACTIVE_STORIES } from "../../type";
import { saveStories, loadStoriesCache } from "../../../services/chatCacheDB";

export const getActiveStories = () => async (dispatch: any) => {
  // 1. Mostrar cache inmediatamente
  let cached: any[] = [];
  try {
    cached = await loadStoriesCache();
    if (cached.length > 0) {
      dispatch({ type: SUCCEES_ACTIVE_STORIES, payload: cached });
    }
  } catch { /* continuar sin cache */ }

  // 2. Pedir al servidor
  try {
    const response = await apiClient.get("/api/stories/active/");
    const stories = Array.isArray(response.data) ? response.data : [];
    dispatch({
      type: SUCCEES_ACTIVE_STORIES,
      payload: stories,
    });
    // 3. El servidor es la fuente de verdad: persistimos SIEMPRE, incluso si
    //    viene vacío. Así, cuando las historias expiran a las 24h, el caché
    //    queda vacío y no se vuelven a pintar historias muertas al reabrir.
    saveStories(stories).catch(console.error);
    return stories;
  } catch (error: any) {
    dispatch({
      type: FAILED_ACTIVE_STORIES,
      payload: error?.message ?? 'error',
    });
    // Ante un fallo de red, devolver el cache para que la barra no se vacíe.
    return cached;
  }
};
