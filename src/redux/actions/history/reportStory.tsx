import { apiClient } from "../../client/api-client";
import { SUCCESS_REPORT_STORY, FAILED_REPORT_STORY } from "../../type";

export interface ReportPayload {
  reason: "spam" | "violence" | "nudity" | "hate" | "other";
  description?: string;
}

export const reportStory =
  (uuid: string, payload: ReportPayload) => async (dispatch: any) => {
    try {
      const response = await apiClient.post(
        `/api/stories/${uuid}/report/`,
        payload
      );
      dispatch({ type: SUCCESS_REPORT_STORY, payload: response.data });
      return { success: true, message: response.data.message };
    } catch (error: any) {
      const message =
        error?.response?.data?.error || "Error al enviar el reporte";
      dispatch({ type: FAILED_REPORT_STORY, payload: message });
      return { success: false, message };
    }
  };
