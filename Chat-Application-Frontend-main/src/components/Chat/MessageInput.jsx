import { useState } from "react";
import { useSocket } from "../../context/SocketContext";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

export default function MessageInput() {
  const [text, setText] = useState("");
  const { socket, onlineUsers } = useSocket();
  const { conversationId, targetUser } = useChat();
  const { user: currentUser } = useAuth();
  
  const sendMessage = (e) => {
    if (e) e.preventDefault();
    const msgContent = text.trim();
    if (!msgContent) return;
    if (!conversationId) {
      alert("Chat room not ready. Please wait a moment or try clicking the user again.");
      return;
    }

    if (!socket) {
      alert("Socket not connected. Please refresh.");
      return;
    }

    socket.emit("send_message", {
      conversationId: String(conversationId),
      content: msgContent,
      participants: [currentUser?._id, targetUser?._id].filter(Boolean),
    });

    setText("");
    console.log("Message emitted!");
  };
  if (!targetUser) return null;
  return (
    <form className="input-area" onSubmit={sendMessage}>
      <input
        className="chat-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            sendMessage(e);
          }
        }}
      />
      <button
        type="submit"
        className="send-btn"
        disabled={!text.trim()}
      >
        <svg viewBox="0 0 24 24" height="24" width="24" fill="currentColor">
          <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
        </svg>
      </button>
    </form>
  );
}
