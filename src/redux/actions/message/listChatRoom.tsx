import { apiClient } from '../../client/api-client';
import { FAILED_LIST_CHATS_ROOM, SUCCEES_LIST_CHATS_ROOM } from '../../type';

export const listChatRooms = (params?: { folder?: string; accessToken?: string }) => async (dispatch: any) => {
  try {
      const searchParams = new URLSearchParams();
      if (params?.folder) searchParams.set('folder', params.folder);
      if (params?.accessToken) searchParams.set('access_token', params.accessToken);
      const query = searchParams.toString();
      const response = await apiClient.get(`/api/chats/${query ? `?${query}` : ''}`)
    if (response.status === 200) {
      dispatch({
        type: SUCCEES_LIST_CHATS_ROOM,
        payload: response.data,
      });
    }
    return { success: true, data: response.data };

  } catch (error) {
    dispatch({
      type: FAILED_LIST_CHATS_ROOM,
      payload: ''
    });
    return { success: false };
  }
};
