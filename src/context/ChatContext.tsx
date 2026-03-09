// src/context/ChatContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";



type ChatContextType = {
  selectedChat: string | null;
  setSelectedChat: (chatUuid: string | null) => void;
  showMessages: boolean;
  setShowMessages: (show: boolean) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
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
  console.log("----------------", context)
  return context;
};