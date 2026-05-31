import { apiClient } from "../../client/api-client";
import { FAILED_ACTIVE_STORIES, SUCCEES_ACTIVE_STORIES } from "../../type";
import { saveStories, loadStoriesCache } from "../../../services/chatCacheDB";

export const getActiveStories = () => async (dispatch: any) => {
  // 1. Mostrar cache inmediatamente
  try {
    const cached = await loadStoriesCache();
    if (cached.length > 0) {
      dispatch({ type: SUCCEES_ACTIVE_STORIES, payload: cached });
    }
  } catch { /* continuar sin cache */ }

  // 2. Pedir al servidor
  try {
    const response = await apiClient.get("/api/stories/active/");
    dispatch({
      type: SUCCEES_ACTIVE_STORIES,
      payload: response.data,
    });
    // 3. Guardar en cache
    const stories = Array.isArray(response.data) ? response.data : [];
    if (stories.length > 0) saveStories(stories).catch(console.error);
    return response.data;
  } catch (error: any) {
    dispatch({
      type: FAILED_ACTIVE_STORIES,
      payload: error?.message ?? 'error',
    });
  }
};
