// actions/chatActions.ts (o donde tengas tus actions)

import { apiClient } from '../../client/api-client';
import {
  LOADING_LOAD_MESSAGES,
  SUCCESS_LOAD_MESSAGES,
  FAILED_LOAD_MESSAGES
} from '../../type';

// Acción para cargar los mensajes de un chat específico
export const loadChatMessages = (chat_uuid: string) => async (dispatch: any) => {
  // 1. Dispatch loading
  dispatch({ type: LOADING_LOAD_MESSAGES });

  try {
    // 2. Llamada a la API
    const response = await apiClient.get(`/api/chats/${chat_uuid}/messages/`); 
    // Ajusta la ruta según tu urls.py:
    // Si es path('chats/<str:chat_uuid>/messages/', ...) → /api/chats/abc123/messages/

    // 3. Verificar respuesta
    if (response.status === 200 || response.status === 201) {
      dispatch({
        type: SUCCESS_LOAD_MESSAGES,
        payload: response.data,  // ← Asegúrate de que tu API retorne { messages: [...] }
      });
    } else {
      throw new Error('Respuesta inesperada del servidor');
    }

  } catch (error: any) {
    // 4. Manejo de error detallado
    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      'Error al cargar los mensajes';

    dispatch({
      type: FAILED_LOAD_MESSAGES,
      payload: errorMessage,
    });

    console.error('Error cargando mensajes:', error);
  }
};