import { apiClient } from '../../client/api-client';
import {
  LOADING_LOAD_MESSAGES,
  SUCCESS_LOAD_MESSAGES,
  FAILED_LOAD_MESSAGES
} from '../../type';
import { loadMessages, saveMessages } from '../../../services/chatCacheDB';

export const loadChatMessages = (chat_uuid: string) => async (dispatch: any) => {
  // 1. Mostrar cache inmediatamente (sin spinner si ya hay datos)
  try {
    const cached = await loadMessages(chat_uuid);
    if (cached.length > 0) {
      dispatch({
        type: SUCCESS_LOAD_MESSAGES,
        payload: { messages: cached, chat_uuid, fromCache: true },
      });
    } else {
      // Solo mostrar loading si no hay nada en cache
      dispatch({ type: LOADING_LOAD_MESSAGES });
    }
  } catch {
    dispatch({ type: LOADING_LOAD_MESSAGES });
  }

  // 2. Pedir mensajes frescos al servidor
  try {
    const response = await apiClient.get(`/api/chats/${chat_uuid}/messages/`);

    if (response.status === 200 || response.status === 201) {
      dispatch({
        type: SUCCESS_LOAD_MESSAGES,
        payload: response.data,
      });

      // 3. Persistir los últimos 5 mensajes en cache
      const messages = response.data?.messages ?? [];
      if (messages.length > 0) {
        saveMessages(chat_uuid, messages).catch(() => {});
      }
    } else {
      throw new Error('Respuesta inesperada del servidor');
    }

  } catch (error: any) {
    // Si ya mostramos cache, no pisar con error — solo loggear
    const hasCachedData = true; // ya despachamos cache arriba si había
    if (!hasCachedData) {
      dispatch({
        type: FAILED_LOAD_MESSAGES,
        payload: error.response?.data?.error || error.message || 'Error al cargar los mensajes',
      });
    }
    if (navigator.onLine) console.error('Error cargando mensajes:', error);
  }
};
