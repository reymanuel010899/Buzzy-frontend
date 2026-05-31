import { apiClient } from "../../client/api-client";
import { SUCCEES_GET_WALLET } from "../../type";

export const getVideoGiftsReceived = () => async (dispatch: any) => {
  try {
    const response = await apiClient.get("/api/videos/gifts/received/");
    dispatch({ type: "SUCCEES_VIDEO_GIFTS_RECEIVED", payload: response.data });
    return response.data;
  } catch (error) {
    dispatch({ type: "FAILED_VIDEO_GIFTS_RECEIVED", payload: (error as any)?.message ?? 'error' });
  }
};

export const markVideoGiftsSeen = (uuid: string) => async (dispatch: any) => {
  try {
    await apiClient.post("/api/videos/gifts/mark-seen/", { uuid });
    // Refresh wallet so tokens appear immediately
    const walletRes = await apiClient.get("/api/get-wallet/");
    dispatch({ type: SUCCEES_GET_WALLET, payload: walletRes.data });
  } catch (error) {
    console.error("Error marcando regalo como visto:", error);
  }
};
