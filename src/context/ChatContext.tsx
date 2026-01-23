// src/context/ChatContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

type Chat = {
  id: string;
  username: string;
  name: string;
  lastMessage: string;
  time: string;
  online: boolean;
  unread: boolean;
  // Agrega aquí más campos si los necesitas (profile_pic, etc.)
};

type ChatContextType = {
  selectedChat: Chat | null;
  setSelectedChat: (chat: Chat | null) => void;
  showMessages: boolean;
  setShowMessages: (show: boolean) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showMessages, setShowMessages] = useState(false);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        showMessages,
        setShowMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// Hook personalizado para usarlo fácil en cualquier componente
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat debe usarse dentro de un ChatProvider");
  }
  return context;
};