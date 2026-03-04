import { apiClient } from '../../client/api-client';
import { FAILED_LIST_CHATS_ROOM, SUCCEES_LIST_CHATS_ROOM } from '../../type';


export const listChatRooms = () => async (dispatch: any) => {
  try {
      const response = await apiClient.get('/api/chats/')
    if (response.status === 200) {
      dispatch({
        type: SUCCEES_LIST_CHATS_ROOM,
        payload: response.data,
      });
    }

  } catch (error) {
    dispatch({
      type: FAILED_LIST_CHATS_ROOM,
      payload: ''
    });
  }
};

