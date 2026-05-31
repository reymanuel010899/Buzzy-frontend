import { apiClient } from '../../client/api-client';
import { FAILED_LIST_CHATS_ROOM, SUCCEES_LIST_CHATS_ROOM } from '../../type';
import { saveChatList, loadChatList } from '../../../services/chatCacheDB';
import { useUnreadMessages } from '../../../context/UnreadAcount';
import { ChatRoom } from '../../reducers/message/listChatRoom';

function syncUnreadFromServer(chats: ChatRoom[]) {
  const { setUnreadCount, resetAll } = useUnreadMessages.getState();
  // Resetear todo primero para que no queden contadores fantasma de chats eliminados
  resetAll();
  for (const chat of chats) {
    if (chat.unread_count > 0) {
      setUnreadCount(chat.uuid, chat.unread_count);
    }
  }
}

export const listChatRooms = (params?: { folder?: string; accessToken?: string }) => async (dispatch: any) => {
  // 1. Mostrar cache local inmediatamente si hay datos
  try {
    const cached = await loadChatList();
    if (cached.length > 0) {
      dispatch({
        type: SUCCEES_LIST_CHATS_ROOM,
        payload: { chats: cached },
      });
    }
  } catch (e) {
    console.warn('[listChatRooms] cache load failed:', e);
  }

  // 2. Pedir al servidor en paralelo
  try {
    const searchParams = new URLSearchParams();
    if (params?.folder) searchParams.set('folder', params.folder);
    if (params?.accessToken) searchParams.set('access_token', params.accessToken);
    const query = searchParams.toString();
    const response = await apiClient.get(`/api/chats/${query ? `?${query}` : ''}`);

    if (response.status === 200) {
      const chats = response.data?.chats ?? [];

      // 3. Actualizar UI con datos frescos del servidor
      dispatch({
        type: SUCCEES_LIST_CHATS_ROOM,
        payload: response.data,
      });

      // 4. Sincronizar contadores reales del servidor — elimina badges fantasma
      try { syncUnreadFromServer(chats); } catch { /* no bloquear el cache */ }

      // 5. Persistir en cache para la próxima vez
      saveChatList(chats).catch(console.error);
    }
    return { success: true, data: response.data };

  } catch (error) {
    dispatch({
      type: FAILED_LIST_CHATS_ROOM,
      payload: '',
    });
    return { success: false };
  }
};
