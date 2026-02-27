// reducers/listChatRooms.ts (o el nombre que uses)

import { FAILED_LIST_CHATS_ROOM, SUCCEES_LIST_CHATS_ROOM } from '../../type';

// === Interfaces de la respuesta del backend (de types/chat.ts) ===
export interface OtherUser {
  id: number;
  username: string;
  name: string;
  avatar: string | null;
}

export interface OtherUserOnline {
  is_online: boolean;
  last_seen: string | null;
}

export interface LastMessage {
  content: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'gif';
  time: string;
}

export interface ChatRoom {
  uuid: string;
  other_user: OtherUser;
  last_message: LastMessage | null;
  unread_count: number;
  updated_at: string;
  other_user_online: OtherUserOnline;
}

export interface ChatListResponse {
  chats: ChatRoom[];
}

// 1. **Definir la Interfaz del Estado**
interface ListChatRoomsState {
  chats: {
    chats: ChatRoom[];
  } | null;   // Lista de chats protegida dentro de un objeto
  loading: boolean;
  error: string | null;
}

// 2. **Estado Inicial**
const initialState: ListChatRoomsState = {
  chats: null,
  loading: false,
  error: null,
};

// 3. **Acción de Éxito**
interface SuccessListChatsAction {
  type: typeof SUCCEES_LIST_CHATS_ROOM;
  payload: {
    chats: ChatRoom[];
  };
}

// 4. **Acción de Fallo**
interface FailedListChatsAction {
  type: typeof FAILED_LIST_CHATS_ROOM;
  payload: string; // Mensaje de error
}

// 5. **Acción de Loading (opcional pero muy útil para UI)**
interface LoadingListChatsAction {
  type: 'LOADING_LIST_CHATS_ROOM'; // Puedes definir este tipo también
}

// 6. **Unir todos los tipos de acción**
type ChatRoomsAction =
  | SuccessListChatsAction
  | FailedListChatsAction
  | LoadingListChatsAction;

// 7. **El Reducer Tipado**
const listChatRoomsReducer = (
  state: ListChatRoomsState = initialState,
  action: ChatRoomsAction
): ListChatRoomsState => {
  switch (action.type) {
    case SUCCEES_LIST_CHATS_ROOM:
      return {
        ...state,
        loading: false,
        chats: action.payload,   // TypeScript sabe que es ChatRoom[]
        error: null,
      };

    case FAILED_LIST_CHATS_ROOM:
      return {
        ...state,
        loading: false,
        chats: null,
        error: action.payload,
      };

    case 'LOADING_LIST_CHATS_ROOM':
      return {
        ...state,
        loading: true,
        error: null,
      };

    default:
      return state;
  }
};

export default listChatRoomsReducer;