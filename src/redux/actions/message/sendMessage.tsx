import { apiClient } from '../../client/api-client';
import { FAILED_SEND_MESSAGE, SUCCEES_SEND_MESSAGE } from '../../type';

export const sendMessage = (body: FormData) => async (dispatch: any) => {
  try {
    const response = await apiClient.post('/api/chats/send/', body, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (response.status === 200) {
      console.log("Message sent successfully:", response.data);
      dispatch({
        type: SUCCEES_SEND_MESSAGE,
        payload: response.data,
      });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    dispatch({
      type: FAILED_SEND_MESSAGE,
      payload: ''
    });
  }
};
