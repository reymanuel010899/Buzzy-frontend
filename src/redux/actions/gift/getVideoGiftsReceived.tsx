import { apiClient } from "../../client/api-client";

export const getVideoGiftsReceived = () => async (dispatch: any) => {
  try {
    const response = await apiClient.get("/api/videos/gifts/received/");
    dispatch({ type: "SUCCEES_VIDEO_GIFTS_RECEIVED", payload: response.data });
    return response.data;
  } catch (error) {
    dispatch({ type: "FAILED_VIDEO_GIFTS_RECEIVED", payload: error });
  }
};

export const markVideoGiftsSeen = (uuid?: string) => async () => {
  try {
    await apiClient.post("/api/videos/gifts/mark-seen/", uuid ? { uuid } : {});
  } catch (error) {
    console.error("Error marcando regalo como visto:", error);
  }
};
