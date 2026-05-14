import { useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { updateProfilePhoto } from "../api/auth";

export default function UserList() {
  const { onlineUsers } = useSocket();
  const {
    targetUser,
    userList,
    filteredUserList,
    contacts,
    filteredContacts,
    discoverUsers,
    saveContact,
    editContact,
    removeContact,
    startDirectChat,
    openConversation,
    createGroup,
    searchChats,
    searchQuery,
    activeChatFilter,
    setActiveChatFilter,
    favoriteConversationIds,
  } = useChat();
  const { user: currentUser, updateUser, logout } = useAuth();
  const fileInputRef = useRef(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [editingContact, setEditingContact] = useState(null);

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?._id) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const avatarUrl = reader.result;
        const response = await updateProfilePhoto(currentUser._id, { avatarUrl });
        updateUser(response.data);
      } catch (error) {
        alert("Profile photo update failed.");
      }
    };
    reader.readAsDataURL(file);
  };

  const resetContactModal = () => {
    setIsContactModalOpen(false);
    setContactName("");
    setContactEmail("");
    setEditingContact(null);
  };

  const handleCreateGroup = () => {
    const groupName = window.prompt("Group name:");
    if (!groupName?.trim()) return;

    const registeredContacts = contacts.filter((contact) => contact.isRegistered && contact.user?._id);

    if (registeredContacts.length < 2) {
      alert("Save at least two contacts before creating a group.");
      return;
    }

    const options = registeredContacts
      .map((contact) => `${contact.displayName} (${contact.user?.username})`)
      .join(", ");

    const picked = window.prompt(
      `Type saved contact usernames for the group, separated by commas.\nAvailable: ${options}`,
    );

    if (!picked?.trim()) return;

    const pickedUsernames = picked
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const selectedContacts = registeredContacts.filter((contact) =>
      pickedUsernames.includes(contact.user?.username?.toLowerCase()) ||
      pickedUsernames.includes(contact.displayName?.toLowerCase()),
    );

    if (selectedContacts.length < 2) {
      alert("Pick at least two saved contacts to create a group.");
      return;
    }

    createGroup(
      groupName.trim(),
      selectedContacts.map((contact) => contact.user._id),
    );
  };

  const handleNewContact = () => {
    setEditingContact(null);
    setContactName("");
    setContactEmail("");
    setIsContactModalOpen(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setContactName(contact.displayName || "");
    setContactEmail(contact.email || "");
    setIsContactModalOpen(true);
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    const normalizedName = contactName.trim();
    const normalizedEmail = contactEmail.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) return;

    if (editingContact) {
      await editContact(editingContact.email, normalizedName);
    } else {
      await saveContact(normalizedEmail, normalizedName);
    }

    resetContactModal();
  };

  const handleInvite = (contact) => {
    const inviteText = `Join me on Chat Application with this email: ${contact.email}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteText).catch(() => {});
    }
    alert(`Invite text ready for ${contact.email}`);
  };

  const renderAvatar = (entryName, avatarUrl, isOnline) => (
    <div className="avatar-container">
      {avatarUrl ? (
        <img className="avatar avatar-image" src={avatarUrl} alt={entryName} />
      ) : (
        <div className="avatar">{entryName?.charAt(0).toUpperCase()}</div>
      )}
      <div className={`status-dot ${isOnline ? "online" : ""}`} />
    </div>
  );

  const renderRow = ({
    key,
    title,
    subtitle,
    avatarUrl,
    isOnline,
    isActive,
    onClick,
    badge,
    action,
  }) => (
    <div key={key} className={`user-item ${isActive ? "active" : ""}`} onClick={onClick}>
      {renderAvatar(title, avatarUrl, isOnline)}

      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
          <div style={{ fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>
          {action}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px", gap: "10px" }}>
          <div
            style={{
              fontSize: "12px",
              color: badge ? "var(--accent-green)" : "var(--text-secondary)",
              fontWeight: badge ? "500" : "400",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "150px",
            }}
          >
            {subtitle}
          </div>
          {badge ? <div className="unread-badge">{badge}</div> : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: "pointer" }}
          title="Update profile photo"
        >
          {renderAvatar(currentUser?.username, currentUser?.avatarUrl, onlineUsers.includes(currentUser?._id))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarPick}
        />

        <div style={{ flex: 1, marginLeft: "10px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis" }}>
          {currentUser?.username} (Me)
        </div>
        <button
          onClick={logout}
          style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      <div style={{ padding: "12px 15px 0" }}>
        <div className="sidebar-actions">
          <button className="primary-sidebar-btn" onClick={handleNewContact}>
            New Contact
          </button>
          <button className="ghost-btn" onClick={handleCreateGroup}>
            New Group
          </button>
        </div>
        <input
          className="chat-input"
          placeholder="Search chats or users"
          value={searchQuery}
          onChange={(e) => searchChats(e.target.value)}
        />
        <div className="filter-row">
          {[
            { id: "all", label: `All (${userList.length})` },
            { id: "unread", label: "Unread" },
            { id: "groups", label: "Groups" },
            { id: "favorites", label: `Favorites (${favoriteConversationIds.length})` },
          ].map((filter) => (
            <button
              key={filter.id}
              className={`filter-pill ${activeChatFilter === filter.id ? "active" : ""}`}
              onClick={() => setActiveChatFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "15px", color: "var(--accent-green)", fontSize: "0.9rem", fontWeight: "600" }}>
        CHATS
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredUserList.map((entry) => {
          const isGroup = entry.type === "group";
          const directUser = entry.participantDetails?.[0];
          const matchedContact = !isGroup
            ? filteredContacts.find((contact) => String(contact.email) === String(directUser?.email))
            : null;
          const title = isGroup ? entry.title || entry.name : matchedContact?.displayName || directUser?.username || entry.title;
          const avatarUrl = isGroup ? entry.chatAvatarUrl : directUser?.avatarUrl;
          const isOnline = !isGroup && onlineUsers.includes(String(directUser?._id));
          const isActive =
            isGroup
              ? String(targetUser?._id) === String(entry._id)
              : String(targetUser?._id) === String(directUser?._id);

          return renderRow({
            key: entry._id,
            title,
            subtitle: entry.lastMessagePreview || entry.lastMessage?.fileName || entry.lastMessage?.content || (isGroup ? "Encrypted group conversation" : directUser?.email),
            avatarUrl,
            isOnline,
            isActive,
            badge: isActive ? 0 : entry.unreadCount,
            onClick: () => (isGroup ? openConversation(entry, title) : directUser ? startDirectChat(directUser, title) : null),
          });
        })}

        {filteredUserList.length === 0 ? (
          <div className="helper-text">No chats found for this filter.</div>
        ) : null}

        <div className="section-header">
          <span>SAVED CONTACTS</span>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="helper-text">Save contacts here, then create WhatsApp-style group chats.</div>
        ) : null}

        {filteredContacts.map((contact) =>
          renderRow({
            key: `contact-${contact.email}`,
            title: contact.displayName,
            subtitle: contact.isRegistered
              ? `${contact.user?.username} | On Chat App`
              : `${contact.email} | Invite available`,
            avatarUrl: contact.user?.avatarUrl,
            isOnline: contact.isRegistered && onlineUsers.includes(String(contact.user?._id)),
            isActive: contact.isRegistered && String(targetUser?._id) === String(contact.user?._id),
            onClick: () => {
              if (contact.isRegistered && contact.user) {
                startDirectChat(contact.user, contact.displayName);
              } else {
                handleInvite(contact);
              }
            },
            action: (
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="tiny-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (contact.isRegistered && contact.user) {
                      startDirectChat(contact.user, contact.displayName);
                    } else {
                      handleInvite(contact);
                    }
                  }}
                >
                  {contact.isRegistered ? "Chat" : "Invite"}
                </button>
                <button
                  className="tiny-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditContact(contact);
                  }}
                >
                  Edit
                </button>
                <button
                  className="tiny-action danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeContact(contact.email);
                  }}
                >
                  Remove
                </button>
              </div>
            ),
          }),
        )}

        <div className="section-header">
          <span>ALL USERS</span>
        </div>

        {discoverUsers.map((entry) =>
          renderRow({
            key: `discover-${entry._id}`,
            title: entry.username,
            subtitle: entry.email,
            avatarUrl: entry.avatarUrl,
            isOnline: onlineUsers.includes(String(entry._id)),
            isActive: String(targetUser?._id) === String(entry._id),
            onClick: () => startDirectChat(entry, entry.username),
            action: (
              <button
                className="tiny-action"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingContact(null);
                  setContactName(entry.username || "");
                  setContactEmail(entry.email || "");
                  setIsContactModalOpen(true);
                }}
              >
                Save
              </button>
            ),
          }),
        )}
      </div>

      {isContactModalOpen ? (
        <div className="modal-backdrop" onClick={resetContactModal}>
          <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contact-modal-title">
              {editingContact ? "Edit Contact" : "New Contact"}
            </div>
            <div className="contact-modal-subtitle">
              {editingContact
                ? "Update the saved contact name."
                : "Save a contact by name and email. Registered emails will show Chat automatically."}
            </div>

            <form onSubmit={handleContactSubmit} className="contact-modal-form">
              <input
                className="chat-input modal-input"
                placeholder="Contact name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />
              <input
                className="chat-input modal-input"
                placeholder="Email address"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={Boolean(editingContact)}
                required
              />
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={resetContactModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-sidebar-btn modal-submit">
                  {editingContact ? "Save Changes" : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
