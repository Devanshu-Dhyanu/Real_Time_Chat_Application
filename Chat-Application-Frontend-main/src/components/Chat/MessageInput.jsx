import { useRef, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import { encryptMessageForParticipants } from "../../utils/e2ee";

export default function MessageInput() {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sharingLiveLocation, setSharingLiveLocation] = useState(false);
  const { socket } = useSocket();
  const { conversationId, targetUser } = useChat();
  const { user: currentUser, encryptionReady } = useAuth();
  const fileInputRef = useRef(null);
  const liveLocationWatchRef = useRef(null);
  const liveLocationTimeoutRef = useRef(null);

  const buildRecipients = () => {
    const recipientEntries = targetUser?.isGroup
      ? [
          { userId: currentUser?._id, publicKey: currentUser?.publicKey },
          ...((targetUser.participantDetails || []).map((participant) => ({
            userId: participant._id,
            publicKey: participant.publicKey,
          }))),
        ]
      : [
          { userId: currentUser?._id, publicKey: currentUser?.publicKey },
          { userId: targetUser?._id, publicKey: targetUser?.publicKey },
        ];

    return recipientEntries.filter(
      (entry, index, list) =>
        entry.userId &&
        entry.publicKey &&
        list.findIndex((candidate) => String(candidate.userId) === String(entry.userId)) === index,
    );
  };

  const emitEncryptedMessage = async (payload) => {
    if (!conversationId) {
      alert("Chat room not ready. Please wait a moment or try clicking the user again.");
      return false;
    }

    if (!socket) {
      alert("Socket not connected. Please refresh.");
      return false;
    }

    if (!encryptionReady || !currentUser?.publicKey) {
      alert("Encryption keys are still loading. Please try again.");
      return false;
    }

    const recipients = buildRecipients();

    if (recipients.length === 0 || recipients.some((entry) => !entry.publicKey)) {
      alert("Participant encryption keys are missing. Ask everyone to reopen the app once.");
      return false;
    }

    const { encryptedPayload, encryptedKeys } = await encryptMessageForParticipants(
      payload,
      recipients,
    );

    socket.emit("send_message", {
      conversationId: String(conversationId),
      type: payload.type || "text",
      encryptedPayload,
      encryptedKeys,
      participants: recipients.map((entry) => entry.userId),
    });

    return true;
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    const msgContent = text.trim();

    if (!msgContent && !attachment) return;
    const sent = await emitEncryptedMessage({
      content: attachment ? msgContent || attachment.fileName : msgContent,
      mediaUrl: attachment?.mediaUrl || "",
      fileName: attachment?.fileName || "",
      mimeType: attachment?.mimeType || "",
      type: attachment?.type || "text",
    });

    if (!sent) return;

    setText("");
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        type: file.type.startsWith("image/") ? "image" : "file",
        mediaUrl: reader.result,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const sendLocationMessage = async ({ latitude, longitude, isLive = false, sharedUntil = null }) => {
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    await emitEncryptedMessage({
      type: "location",
      content: isLive ? "Live location" : "Current location",
      mediaUrl: "",
      fileName: "",
      mimeType: "application/location",
      latitude,
      longitude,
      mapsUrl,
      isLive,
      sharedUntil,
      locationLabel: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    });
  };

  const handleLocationShare = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser.");
      return;
    }

    const mode = window.prompt("Type 'live' for 15 min live location or 'current' for one-time location.");
    if (!mode) return;

    const normalizedMode = mode.trim().toLowerCase();
    if (normalizedMode !== "live" && normalizedMode !== "current") {
      alert("Please type either 'live' or 'current'.");
      return;
    }

    if (normalizedMode === "current") {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await sendLocationMessage({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => alert("Could not fetch your current location."),
        { enableHighAccuracy: true, timeout: 10000 },
      );
      return;
    }

    if (sharingLiveLocation) {
      if (liveLocationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(liveLocationWatchRef.current);
      }
      if (liveLocationTimeoutRef.current) {
        clearTimeout(liveLocationTimeoutRef.current);
      }
      liveLocationWatchRef.current = null;
      liveLocationTimeoutRef.current = null;
      setSharingLiveLocation(false);
      return;
    }

    const sharedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    setSharingLiveLocation(true);

    liveLocationWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        await sendLocationMessage({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isLive: true,
          sharedUntil,
        });
      },
      () => {
        alert("Could not start live location sharing.");
        setSharingLiveLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    liveLocationTimeoutRef.current = setTimeout(() => {
      if (liveLocationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(liveLocationWatchRef.current);
      }
      liveLocationWatchRef.current = null;
      liveLocationTimeoutRef.current = null;
      setSharingLiveLocation(false);
    }, 15 * 60 * 1000);
  };

  if (!targetUser) return null;

  return (
    <form className="input-area" onSubmit={sendMessage}>
      <button type="button" className="send-btn" onClick={() => fileInputRef.current?.click()}>
        +
      </button>
      <button type="button" className={`send-btn ${sharingLiveLocation ? "live-active" : ""}`} onClick={handleLocationShare}>
        Loc
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <input
        className="chat-input"
        placeholder={attachment ? `Add a caption for ${attachment.fileName}` : "Type a message"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            sendMessage(e);
          }
        }}
      />
      {attachment ? (
        <div className="attachment-pill" title={attachment.fileName}>
          <span>{attachment.type === "image" ? `Image: ${attachment.fileName}` : attachment.fileName}</span>
          <button
            type="button"
            className="attachment-clear"
            onClick={() => {
              setAttachment(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            x
          </button>
        </div>
      ) : null}
      <button type="submit" className="send-btn" disabled={!text.trim() && !attachment}>
        <svg viewBox="0 0 24 24" height="24" width="24" fill="currentColor">
          <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
        </svg>
      </button>
    </form>
  );
}
