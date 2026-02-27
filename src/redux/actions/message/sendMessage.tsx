import { apiClient } from '../../client/api-client';
import { FAILED_SEND_MESSAGE, SUCCEES_SEND_MESSAGE } from '../../type';

type SendMessageBody = {
  recipient_id: number;
  content: string;
  message_type: "text" | "image" | "video" | "voice" | "gif"
};
export const sendMessage = (body: SendMessageBody) => async (dispatch: any) => {
  try {
      const response = await apiClient.post('/api/chats/send/', body);
    if (response.status === 200) {
      console.log("Like created successfully:", response.data);
      dispatch({
        type: SUCCEES_SEND_MESSAGE,
        payload: response.data,
      });
    }

  } catch {
    dispatch({
      type: FAILED_SEND_MESSAGE,
      payload: ''
    });
  }
};
