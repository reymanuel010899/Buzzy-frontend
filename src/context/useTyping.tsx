// useTypingUsers.ts
import { create } from "zustand";

type TypingByChat = {
  [chatUUID: string]: Record<number, string>;
};

interface TypingUsersStore {
  typingByChat: TypingByChat;

  setTypingUser: (
    chatUUID: string,
    userId: number,
    username: string
  ) => void;

  removeTypingUser: (
    chatUUID: string,
    userId: number
  ) => void;

  resetChatTyping: (chatUUID: string) => void;
}

export const useTypingUsers = create<TypingUsersStore>((set) => ({
  typingByChat: {},

  setTypingUser: (chatUUID, userId, username) =>
    set((state) => ({
      typingByChat: {
        ...state.typingByChat,
        [chatUUID]: {
          ...(state.typingByChat[chatUUID] || {}),
          [userId]: username,
        },
      },
    })),

  removeTypingUser: (chatUUID, userId) =>
    set((state) => {
      const chatTyping = { ...(state.typingByChat[chatUUID] || {}) };
      delete chatTyping[userId];

      const newState = { ...state.typingByChat };

      if (Object.keys(chatTyping).length === 0) {
        delete newState[chatUUID];
      } else {
        newState[chatUUID] = chatTyping;
      }

      return { typingByChat: newState };
    }),

  resetChatTyping: (chatUUID) =>
    set((state) => {
      const copy = { ...state.typingByChat };
      delete copy[chatUUID];
      return { typingByChat: copy };
    }),
}));
