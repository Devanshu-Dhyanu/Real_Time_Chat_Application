import React, { useRef, useEffect } from "react";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

const MessageList = () => {
  const { messages } = useChat();
  const { user } = useAuth();
  const scrollRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((m, i) => {
        const senderId = 
          (m.senderId?._id || m.senderId) || 
          (m.sender?._id || m.sender);
          
        const myId = user?._id || user?.id;
        const isMe = String(senderId) === String(myId);
        
        return (
          <div
            key={m._id || i}
            className={`message-bubble ${isMe ? "message-sent" : "message-rcvd"}`}
          >
            <div className="message-content">{m.content}</div>
            <div className="message-time">
              {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        );
      })}
      <div ref={scrollRef} />
    </div>
  );
};

export default MessageList;
