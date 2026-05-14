import { useEffect } from "react";
import { useSocket } from "../../context/SocketContext";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import MessageList from "./MessageList";

export default function ChatWindow() {
  const { socket, onlineUsers } = useSocket();
  const { conversationId, setMessages, targetUser } = useChat();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit("join_conversation", { conversationId });

    socket.on("message_history", ({ messages }) => {
      setMessages(messages);
    });

    socket.on("new_message", (data) => {
      const actualMessage = data.message || data;
      setMessages((prev) => [...prev, actualMessage]);

      // If we are looking at this chat, tell the server we've read it
      socket.emit("mark_as_read", { conversationId });
    });

    return () => {
      socket.off("message_history");
      socket.off("new_message");
    };
  }, [socket, conversationId]);

  if (!targetUser) {
    return (
      <div className="chat-window" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>Chat Application</h2>
          <p>Select a user to start chatting</p>
        </div>
      </div>
    );
  }

  const isOnline = targetUser && onlineUsers.some(id => String(id) === String(targetUser._id));

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="avatar">{targetUser.username?.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600' }}>{targetUser.username}</div>
          <div style={{ fontSize: '12px', color: isOnline ? 'var(--online-glow)' : 'var(--text-secondary)' }}>
            {isOnline ? 'online' : 'offline'}
          </div>
        </div>
      </div>
      <MessageList />
    </div>
  );
}
