import React, { useContext, useEffect } from "react";
import { ChatContext } from "../../context/ChatContext";

const ConversationList = () => {
  const { conversations, joinConversation, loadConversations } =
    useContext(ChatContext);

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <div>
      {conversations.map((c) => (
        <div key={c._id} onClick={() => joinConversation(c._id)}>
          {c.name || "Direct Chat"}
        </div>
      ))}
    </div>
  );
};

export default ConversationList;