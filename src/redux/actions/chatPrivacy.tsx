import { apiClient } from "../client/api-client";

export type ChatPrivacyStatus = {
  has_pin: boolean;
  hidden_verified: boolean;
  hidden_verified_at: string | null;
  updated_at: string | null;
};

export const getChatPrivacyStatus = async (): Promise<ChatPrivacyStatus> => {
  const response = await apiClient.get("/api/chat-privacy/");
  return response.data;
};

export const saveChatPrivacyPin = async (payload: {
  current_pin?: string;
  new_pin?: string;
  confirm_pin?: string;
  remove_pin?: boolean;
}) => {
  const response = await apiClient.put("/api/chat-privacy/pin/", payload);
  return response.data;
};

export const verifyChatPin = async (pin: string) => {
  const response = await apiClient.post("/api/verify-pin/", { pin });
  return response.data as { access_token?: string; verified_until?: string; message?: string };
};
