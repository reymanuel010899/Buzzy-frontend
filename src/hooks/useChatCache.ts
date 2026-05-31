// Hook que expone el cache de chats/mensajes al resto de la app
import { useCallback } from "react";
import {
  saveChatList,
  loadChatList,
  saveMessages,
  loadMessages,
} from "../services/chatCacheDB";
import { ChatRoom } from "../redux/reducers/message/listChatRoom";
import { Message } from "../redux/reducers/message/chatMeesage";

export function useChatCache() {
  const persistChats = useCallback(async (chats: ChatRoom[]) => {
    try {
      await saveChatList(chats);
    } catch {
      // fallo silencioso: el cache es best-effort
    }
  }, []);

  const getCachedChats = useCallback(async (): Promise<ChatRoom[]> => {
    try {
      return await loadChatList();
    } catch {
      return [];
    }
  }, []);

  const persistMessages = useCallback(
    async (chat_uuid: string, messages: Message[]) => {
      try {
        await saveMessages(chat_uuid, messages);
      } catch {
        // fallo silencioso
      }
    },
    []
  );

  const getCachedMessages = useCallback(
    async (chat_uuid: string): Promise<Message[]> => {
      try {
        return await loadMessages(chat_uuid);
      } catch {
        return [];
      }
    },
    []
  );

  return { persistChats, getCachedChats, persistMessages, getCachedMessages };
}
