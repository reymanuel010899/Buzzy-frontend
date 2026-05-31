// src/context/ChatContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

type ChatContextType = {
  selectedChat: string | null;
  setSelectedChat: (chatUuid: string | null) => void;
  showMessages: boolean;
  setShowMessages: (show: boolean) => void;
  pendingFolder: string | null;
  setPendingFolder: (folder: string | null) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [pendingFolder, setPendingFolder] = useState<string | null>(null);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        showMessages,
        setShowMessages,
        pendingFolder,
        setPendingFolder,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat debe usarse dentro de un ChatProvider");
  }
  return context;
};
