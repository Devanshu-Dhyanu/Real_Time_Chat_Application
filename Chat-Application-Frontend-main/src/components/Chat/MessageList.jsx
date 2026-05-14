import React, { useEffect, useRef } from "react";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

const normalizeIds = (values) =>
  (values || []).map((value) => value?._id || value?.userId || value);

const getStatusLabel = (message, currentUserId, participantCount) => {
  const senderId = (message.senderId?._id || message.senderId) || (message.sender?._id || message.sender);
  if (String(senderId) !== String(currentUserId)) return "";

  const seenCount = normalizeIds(message.readBy).filter((id) => String(id) !== String(currentUserId)).length;
  const deliveredCount = normalizeIds(message.deliveredTo).filter((id) => String(id) !== String(currentUserId)).length;
  const expectedRecipients = Math.max((participantCount || 1) - 1, 1);

  if (seenCount >= expectedRecipients) return "Seen";
  if (deliveredCount >= expectedRecipients) return "Delivered";
  return "Sent";
};

const MessageTicks = ({ statusLabel }) => {
  const isDelivered = statusLabel === "Delivered" || statusLabel === "Seen";
  const isSeen = statusLabel === "Seen";

  return (
    <span className={`tick-group ${isSeen ? "ticks-seen" : isDelivered ? "ticks-delivered" : "ticks-sent"}`}>
      <svg viewBox="0 0 16 16" className="tick-icon" aria-hidden="true">
        <path d="M6.1 11.4 2.7 8l1.1-1.1 2.3 2.3 5-5 1.1 1.1z" fill="currentColor" />
      </svg>
      {isDelivered ? (
        <svg viewBox="0 0 16 16" className="tick-icon tick-second" aria-hidden="true">
          <path d="M6.1 11.4 2.7 8l1.1-1.1 2.3 2.3 5-5 1.1 1.1z" fill="currentColor" />
        </svg>
      ) : null}
    </span>
  );
};

const renderMessageBody = (message) => {
  if (message.type === "location" && message.mapsUrl) {
    return (
      <div className="location-card">
        <div className="location-title">
          {message.isLive ? "Live location" : "Current location"}
        </div>
        {message.locationLabel ? <div className="message-caption">{message.locationLabel}</div> : null}
        <a href={message.mapsUrl} target="_blank" rel="noreferrer" className="file-chip">
          Open in Maps
        </a>
        {message.isLive && message.sharedUntil ? (
          <div className="message-caption">
            Sharing till {new Date(message.sharedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        ) : null}
      </div>
    );
  }

  if (message.type === "image" && message.mediaUrl) {
    return (
      <div>
        <img src={message.mediaUrl} alt={message.fileName || "shared image"} className="message-image" />
        {message.content && message.content !== message.fileName ? (
          <div className="message-caption">{message.content}</div>
        ) : null}
      </div>
    );
  }

  if (message.type === "file" && message.mediaUrl) {
    return (
      <div>
        <a
          href={message.mediaUrl}
          download={message.fileName || "attachment"}
          className="file-chip"
        >
          {message.fileName || "Download file"}
        </a>
        {message.content && message.content !== message.fileName ? (
          <div className="message-caption">{message.content}</div>
        ) : null}
      </div>
    );
  }

  return <div className="message-content">{message.content}</div>;
};

const MessageList = () => {
  const { filteredMessages, targetUser, messageSearchQuery } = useChat();
  const { user } = useAuth();
  const scrollRef = useRef();
  const myId = user?._id || user?.id;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  const participantCount = targetUser?.isGroup
    ? (targetUser.participantDetails?.length || 0) + 1
    : 2;

  return (
    <div className="message-list">
      {filteredMessages.map((m, i) => {
        const senderId = (m.senderId?._id || m.senderId) || (m.sender?._id || m.sender);
        const isMe = String(senderId) === String(myId);
        const statusLabel = getStatusLabel(m, myId, participantCount);
        const senderName =
          m.senderId?.username ||
          m.sender?.username ||
          targetUser?.participantDetails?.find(
            (participant) => String(participant._id) === String(senderId),
          )?.username;

        return (
          <div
            key={m._id || i}
            className={`message-bubble ${isMe ? "message-sent" : "message-rcvd"}`}
          >
            {targetUser?.isGroup && !isMe && senderName ? (
              <div className="message-sender">{senderName}</div>
            ) : null}
            {renderMessageBody(m)}
            <div className="message-meta">
              <div className="message-time">
                {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {isMe ? (
                <div className={`message-status status-${statusLabel.toLowerCase()}`} title={statusLabel}>
                  <MessageTicks statusLabel={statusLabel} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      {messageSearchQuery && filteredMessages.length === 0 ? (
        <div className="helper-text">No messages matched this search.</div>
      ) : null}
      <div ref={scrollRef} />
    </div>
  );
};

export default MessageList;
