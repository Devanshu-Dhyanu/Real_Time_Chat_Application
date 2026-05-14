import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [userList, setUserList] = useState([]);

  const { socket } = useSocket();
  const { user: currentUser } = useAuth();

  const activeConversationIdRef = useRef(conversationId);

  useEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleConversationsList = ({ conversations }) => {
      setUserList(conversations);
    };

    const handleConversationStarted = ({ conversation }) => {
      setConversationId(conversation._id);
    };

    const handleUnreadCountUpdated = ({ conversationId, unreadCount }) => {
      setUserList(prev =>
        prev.map(entry =>
          String(entry._id) === String(conversationId)
            ? { ...entry, unreadCount }
            : entry
        )
      );
    };

    socket.on("conversations_list", handleConversationsList);
    socket.on("conversation_started", handleConversationStarted);
    socket.on("unread_count_updated", handleUnreadCountUpdated);

    socket.emit("get_conversations");

    return () => {
      socket.off("conversations_list", handleConversationsList);
      socket.off("conversation_started", handleConversationStarted);
      socket.off("unread_count_updated", handleUnreadCountUpdated);
    };
  }, [socket, currentUser]);

  return (
    <ChatContext.Provider
      value={{
        conversationId,
        setConversationId,
        messages,
        setMessages,
        targetUser,
        setTargetUser,
        userList,
        setUserList,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
