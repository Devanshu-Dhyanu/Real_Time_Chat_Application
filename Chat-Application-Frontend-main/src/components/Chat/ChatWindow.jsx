import { useSocket } from "../../context/SocketContext";
import { useChat } from "../../context/ChatContext";
import MessageList from "./MessageList";
import { useState } from "react";

export default function ChatWindow() {
  const { onlineUsers } = useSocket();
  const {
    targetUser,
    conversationId,
    favoriteConversationIds,
    toggleFavoriteConversation,
    chatThemes,
    chatWallpapers,
    chatThemeId,
    setChatThemeId,
    chatWallpaperId,
    setChatWallpaperId,
    selectedChatTheme,
    selectedChatWallpaper,
    messageSearchQuery,
    setMessageSearchQuery,
  } = useChat();
  const [showAppearancePanel, setShowAppearancePanel] = useState(false);

  if (!targetUser) {
    return (
      <div className="chat-window chat-window-empty">
        <div className="empty-stage">
          <div className="empty-card">
            <div className="empty-card-illustration">
              <div className="empty-screen-window">
                <span className="empty-screen-dot" />
                <span className="empty-screen-lines" />
              </div>
              <div className="empty-phone-window">
                <span className="empty-phone-dot" />
                <span className="empty-phone-tail" />
              </div>
            </div>
            <h2>Welcome to Vajra Teams</h2>
            <p>Open any thread from the left to reply instantly, share files, send live locations, and keep every conversation in sync.</p>
            <button className="empty-primary-btn" type="button">
              Choose a conversation
            </button>
          </div>
          <div className="empty-shortcuts">
            <div className="empty-shortcut-card">
              <div className="empty-shortcut-icon">D</div>
              <span>Send document</span>
            </div>
            <div className="empty-shortcut-card">
              <div className="empty-shortcut-icon">+</div>
              <span>Add contact</span>
            </div>
            <div className="empty-shortcut-card">
              <div className="empty-shortcut-icon">*</div>
              <span>Pin favorites</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = targetUser.savedName || targetUser.username;
  const isOnline = !targetUser.isGroup && onlineUsers.some((id) => String(id) === String(targetUser._id));
  const isFavorite = favoriteConversationIds.includes(String(conversationId));

  return (
    <div
      className="chat-window"
      style={{
        "--theme-accent": selectedChatTheme.accent,
        "--theme-sent": selectedChatTheme.sentBubble,
        "--theme-received": selectedChatTheme.receivedBubble,
        "--chat-theme-bg": selectedChatTheme.background,
        "--chat-wallpaper": selectedChatWallpaper.image,
      }}
    >
      <div className="chat-header">
        {targetUser.avatarUrl ? (
          <img className="avatar avatar-image" src={targetUser.avatarUrl} alt={displayName} />
        ) : (
          <div className="avatar">{displayName?.charAt(0).toUpperCase()}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "600" }}>{displayName}</div>
          <div style={{ fontSize: "12px", color: isOnline ? "var(--online-glow)" : "var(--text-secondary)" }}>
            {targetUser.isGroup
              ? `${targetUser.participantDetails?.length || 0} participants`
              : isOnline
                ? "online"
                : "offline"}
          </div>
        </div>
        <div className="chat-header-actions">
          {conversationId ? (
            <button
              className={`header-icon-btn ${isFavorite ? "active" : ""}`}
              onClick={() => toggleFavoriteConversation(conversationId)}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              Fav
            </button>
          ) : null}
          <button
            className="header-icon-btn"
            onClick={() => setShowAppearancePanel((prev) => !prev)}
            title="Themes and wallpaper"
          >
            Theme
          </button>
        </div>
      </div>
      {showAppearancePanel ? (
        <div className="appearance-panel">
          <div className="appearance-section">
            <div className="appearance-title">Chat Filters</div>
            <div className="appearance-note">Favorites are starred per conversation from the header.</div>
          </div>
          <div className="appearance-section">
            <div className="appearance-title">Themes</div>
            <div className="theme-grid">
              {chatThemes.map((theme) => (
                <button
                  key={theme.id}
                  className={`theme-swatch ${chatThemeId === theme.id ? "active" : ""}`}
                  onClick={() => setChatThemeId(theme.id)}
                >
                  <span className="theme-dot" style={{ background: theme.accent }} />
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
          <div className="appearance-section">
            <div className="appearance-title">Wallpapers</div>
            <div className="theme-grid">
              {chatWallpapers.map((wallpaper) => (
                <button
                  key={wallpaper.id}
                  className={`theme-swatch ${chatWallpaperId === wallpaper.id ? "active" : ""}`}
                  onClick={() => setChatWallpaperId(wallpaper.id)}
                >
                  {wallpaper.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <div className="message-search-bar">
        <input
          className="chat-input"
          placeholder="Search messages in this chat"
          value={messageSearchQuery}
          onChange={(e) => setMessageSearchQuery(e.target.value)}
        />
      </div>
      <MessageList />
    </div>
  );
}
