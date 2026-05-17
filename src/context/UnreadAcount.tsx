import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Definimos la estructura: un objeto donde la llave es el UUID del chat 
// y el valor es la cantidad de mensajes no leídos.
type UnreadCountByChat = {
  [chatUUID: string]: number;
};

interface UnreadMessagesStore {
  unreadCounts: UnreadCountByChat;

  // Acciones
  incrementUnread: (chatUUID: string) => void;
  setUnreadCount: (chatUUID: string, count: number) => void;
  markAsRead: (chatUUID: string) => void;
  getTotalUnread: () => number;
  resetAll: () => void;
}

export const useUnreadMessages = create<UnreadMessagesStore>()(
  persist(
    (set, get) => ({
      unreadCounts: {},

      // Incrementa en 1 (útil cuando llega un mensaje por socket)
      incrementUnread: (chatUUID) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [chatUUID]: (state.unreadCounts[chatUUID] || 0) + 1,
          },
        })),

      // Establece un número específico (útil al cargar la lista de chats desde la API)
      setUnreadCount: (chatUUID, count) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [chatUUID]: count,
          },
        })),

      // Limpia los no leídos de un chat específico
      markAsRead: (chatUUID) =>
        set((state) => {
          const newCounts = { ...state.unreadCounts };
          delete newCounts[chatUUID]; 
          return { unreadCounts: newCounts };
        }),

      // Función auxiliar para obtener el total global
      getTotalUnread: () => {
        return Object.values(get().unreadCounts).reduce((acc, curr) => acc + curr, 0);
      },

      // Limpia todo (por ejemplo, al hacer logout)
      resetAll: () => set({ unreadCounts: {} }),
    }),
    {
      name: "unread-messages-storage", // Nombre de la llave en LocalStorage
      storage: createJSONStorage(() => localStorage), // (Opcional) por defecto usa localStorage
    }
  )
);