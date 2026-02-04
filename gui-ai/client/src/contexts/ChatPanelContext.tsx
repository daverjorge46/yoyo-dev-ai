import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChatPanelContextType {
  isChatOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
}

const ChatPanelContext = createContext<ChatPanelContextType | undefined>(undefined);

interface ChatPanelProviderProps {
  children: ReactNode;
}

export function ChatPanelProvider({ children }: ChatPanelProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const openChat = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  return (
    <ChatPanelContext.Provider
      value={{
        isChatOpen,
        toggleChat,
        openChat,
        closeChat,
      }}
    >
      {children}
    </ChatPanelContext.Provider>
  );
}

export function useChatPanel(): ChatPanelContextType {
  const context = useContext(ChatPanelContext);
  if (context === undefined) {
    throw new Error('useChatPanel must be used within a ChatPanelProvider');
  }
  return context;
}
