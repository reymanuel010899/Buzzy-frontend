import { apiClient } from "../client/api-client";

export const getSavedVideos = () => async (_dispatch: unknown) => {
  try {
    const res = await apiClient.get("api/videos/saved/");
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const saveVideo = (videoId: number | string) => async (_dispatch: unknown) => {
  try {
    const res = await apiClient.post("api/videos/saved/", { video_id: videoId });
    return res.data;
  } catch {
    return null;
  }
};

export const unsaveVideo = (videoId: number | string) => async (_dispatch: unknown) => {
  try {
    const res = await apiClient.delete("api/videos/saved/", { data: { video_id: videoId } });
    return res.data;
  } catch {
    return null;
  }
};
