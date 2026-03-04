// reducers/chatMessages.ts

import {
  SUCCESS_LOAD_MESSAGES,
  FAILED_LOAD_MESSAGES,
  LOADING_LOAD_MESSAGES,
  ADD_NEW_MESSAGE
} from '../../type';  // Asegúrate de definir estas constantes

// === Interface del Mensaje (del backend) ===
export interface Message {
  uuid: string;
  content: string;
  sender_username: string;
  sender_avatar: string | null;
  created_at: string;  // ISO string
  message_type: 'text' | 'image' | 'video' | 'voice' | 'gif' | 'file' | 'document' | 'audio' | 'contact' | 'poll' | 'event' | 'sticker';
  file?: string | null;
}

// 1. **Estado del Reducer**
interface ChatMessagesState {
  messages: {
    messages: Message[];
    chat_uuid?: string;
    other_user?: any;
  } | null;   // Objeto que contiene mensajes y metadata
  loading: boolean;
  error: string | null;
}

// 2. **Estado Inicial**
const initialState: ChatMessagesState = {
  messages: null,
  loading: false,
  error: null,
};

// 3. **Acciones**
interface SuccessLoadMessagesAction {
  type: typeof SUCCESS_LOAD_MESSAGES;
  payload: {
    messages: Message[];
    chat_uuid?: string;
    other_user?: any;
  };
}

interface FailedLoadMessagesAction {
  type: typeof FAILED_LOAD_MESSAGES;
  payload: string;     // Mensaje de error
}

interface LoadingLoadMessagesAction {
  type: typeof LOADING_LOAD_MESSAGES;
}

interface AddNewMessageAction {
  type: typeof ADD_NEW_MESSAGE;
  payload: Message;    // Nuevo mensaje recibido por WS
}

// 4. **Tipo unión de acciones**
type ChatMessagesAction =
  | SuccessLoadMessagesAction
  | FailedLoadMessagesAction
  | LoadingLoadMessagesAction
  | AddNewMessageAction;

// 5. **Reducer**
const chatMessagesReducer = (
  state: ChatMessagesState = initialState,
  action: ChatMessagesAction
): ChatMessagesState => {
  switch (action.type) {
    case SUCCESS_LOAD_MESSAGES:
      return {
        ...state,
        loading: false,
        messages: action.payload,
        error: null,
      };

    case FAILED_LOAD_MESSAGES:
      return {
        ...state,
        loading: false,
        messages: null,
        error: action.payload,
      };

    case LOADING_LOAD_MESSAGES:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case ADD_NEW_MESSAGE:
      return {
        ...state,
        messages: state.messages
          ? { ...state.messages, messages: [...state.messages.messages, action.payload] }
          : { messages: [action.payload] },
      };

    default:
      return state;
  }
};

export default chatMessagesReducer;