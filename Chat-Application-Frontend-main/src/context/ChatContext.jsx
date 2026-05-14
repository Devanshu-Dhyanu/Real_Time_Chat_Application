import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import {
  getContacts,
  getUsers,
  removeContact as removeContactApi,
  saveContact as saveContactApi,
  updateContact as updateContactApi,
} from "../api/auth";
import { decryptMessagePayload, getConversationPreview } from "../utils/e2ee";

const ChatContext = createContext();

const getConversationTimestamp = (conversation) =>
  new Date(
    conversation?.updatedAt ||
      conversation?.lastMessage?.createdAt ||
      conversation?.createdAt ||
      0,
  ).getTime();

const sortConversations = (conversations) =>
  [...conversations].sort(
    (left, right) => getConversationTimestamp(right) - getConversationTimestamp(left),
  );

const CHAT_THEMES = [
  {
    id: "emerald-night",
    label: "Emerald Night",
    accent: "#00a884",
    sentBubble: "#003f5c",
    receivedBubble: "#202c33",
    background: "linear-gradient(180deg, rgba(0, 168, 132, 0.08), rgba(11, 20, 26, 0.96))",
  },
  {
    id: "sunset-glow",
    label: "Sunset Glow",
    accent: "#ff8a3d",
    sentBubble: "#5a2b1a",
    receivedBubble: "#3a241e",
    background: "linear-gradient(180deg, rgba(255, 138, 61, 0.08), rgba(24, 15, 13, 0.96))",
  },
  {
    id: "ocean-mist",
    label: "Ocean Mist",
    accent: "#56cfe1",
    sentBubble: "#124559",
    receivedBubble: "#1b2f3a",
    background: "linear-gradient(180deg, rgba(86, 207, 225, 0.08), rgba(10, 18, 24, 0.96))",
  },
];

const CHAT_WALLPAPERS = [
  {
    id: "bubbles",
    label: "Bubbles",
    image:
      "url('https://imgs.search.brave.com/lfC0MyklU-UZC2z5ogurcyKc4Wt2Y3kuVL-i8KEG8VI/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRpYS5pc3RvY2twaG90by5jb20vaWQvMTMzNzIyOTk4My9waG90by9idWJibGUtdGFsay1vci1jb21tZW50LXNpZ24tc3ltYm9sLW9uLXllbGxvdy1iYWNrZ3JvdW5kLndlYnA_YT0xJmI9MSZzPTYxMng2MTImdz0wJms9MjAmYz15VEUyYU8tM3hsYnNjWnR0UUsxZFVET1o4ME9DTFltdU5lNFNaaWtuX0hrPQ')",
  },
  {
    id: "grid",
    label: "Soft Grid",
    image:
      "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
  },
  {
    id: "aurora",
    label: "Aurora",
    image:
      "radial-gradient(circle at top left, rgba(0,168,132,0.22), transparent 35%), radial-gradient(circle at bottom right, rgba(86,207,225,0.2), transparent 30%)",
  },
];

export const ChatProvider = ({ children }) => {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [userList, setUserList] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatFilter, setActiveChatFilter] = useState("all");
  const [favoriteConversationIds, setFavoriteConversationIds] = useState([]);
  const [chatThemeId, setChatThemeId] = useState(CHAT_THEMES[0].id);
  const [chatWallpaperId, setChatWallpaperId] = useState(CHAT_WALLPAPERS[0].id);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");

  const { socket } = useSocket();
  const { user: currentUser, privateKey, encryptionReady } = useAuth();

  useEffect(() => {
    if (!currentUser?._id) return;

    let isCancelled = false;

    const loadDirectoryData = async () => {
      try {
        const [usersRes, contactsRes] = await Promise.all([
          getUsers(currentUser._id),
          getContacts(currentUser._id),
        ]);

        if (isCancelled) return;

        setAllUsers(usersRes.data || []);
        setContacts(contactsRes.data || []);
      } catch (error) {
        console.log("Failed to load users/contacts", error);
      }
    };

    loadDirectoryData();
    return () => {
      isCancelled = true;
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser?._id) return;

    const savedPrefs = JSON.parse(
      localStorage.getItem(`chat-preferences:${currentUser._id}`) || "{}",
    );

    setFavoriteConversationIds(savedPrefs.favoriteConversationIds || []);
    setChatThemeId(savedPrefs.chatThemeId || CHAT_THEMES[0].id);
    setChatWallpaperId(savedPrefs.chatWallpaperId || CHAT_WALLPAPERS[0].id);
    setActiveChatFilter("all");
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser?._id) return;
    localStorage.setItem(
      `chat-preferences:${currentUser._id}`,
      JSON.stringify({
        favoriteConversationIds,
        chatThemeId,
        chatWallpaperId,
      }),
    );
  }, [currentUser?._id, favoriteConversationIds, chatThemeId, chatWallpaperId]);

  useEffect(() => {
    if (!socket || !currentUser || !privateKey || !encryptionReady) return;

    const decryptSingleMessage = async (message) => {
      try {
        return await decryptMessagePayload(message, privateKey, currentUser._id);
      } catch (error) {
        console.log("Failed to decrypt message", error);
        return {
          ...message,
          content: "[Encrypted message unavailable]",
          mediaUrl: "",
          fileName: "",
          mimeType: "",
        };
      }
    };

    const decorateConversation = async (conversation) => {
      if (!conversation?.lastMessage) return conversation;
      const decryptedLastMessage = await decryptSingleMessage(conversation.lastMessage);
      return {
        ...conversation,
        lastMessage: decryptedLastMessage,
        lastMessagePreview: getConversationPreview(decryptedLastMessage),
      };
    };

    const handleConversationsList = async ({ conversations }) => {
      const nextConversations = await Promise.all(
        (conversations || []).map((conversation) => decorateConversation(conversation)),
      );
      setUserList(sortConversations(nextConversations));
    };

    const handleConversationStarted = async ({ conversation }) => {
      if (!conversation) return;
      const decoratedConversation = await decorateConversation(conversation);
      setConversationId(decoratedConversation._id);
      upsertConversation(decoratedConversation);
    };

    const handleGroupCreated = async ({ conversation }) => {
      if (!conversation) return;
      const decoratedConversation = await decorateConversation(conversation);
      upsertConversation(decoratedConversation);
    };

    const handleUnreadCountUpdated = ({ conversationId: updatedConversationId, unreadCount }) => {
      setUserList((prev) =>
        prev.map((entry) =>
          String(entry._id) === String(updatedConversationId)
            ? { ...entry, unreadCount }
            : entry,
        ),
      );
    };

    const handleConversationUpdated = async ({ conversationId: updatedConversationId, lastMessage }) => {
      const decryptedLastMessage = lastMessage
        ? await decryptSingleMessage(lastMessage)
        : lastMessage;
      setUserList((prev) =>
        sortConversations(
          prev.map((entry) =>
            String(entry._id) === String(updatedConversationId)
              ? {
                  ...entry,
                  lastMessage: decryptedLastMessage,
                  lastMessagePreview: getConversationPreview(decryptedLastMessage),
                  updatedAt: decryptedLastMessage?.createdAt || new Date().toISOString(),
                }
              : entry,
          ),
        ),
      );
    };

    const handleMessagesRead = ({ messages: updatedMessages }) => {
      if (!updatedMessages?.length) return;
      const updatesById = new Map(updatedMessages.map((message) => [String(message._id), message]));
      setMessages((prev) =>
        prev.map((message) => {
          const updatedMessage = updatesById.get(String(message._id));
          return updatedMessage ? { ...message, ...updatedMessage } : message;
        }),
      );
    };

    const handleMessagesDelivered = ({ messages: updatedMessages }) => {
      if (!updatedMessages?.length) return;
      const updatesById = new Map(updatedMessages.map((message) => [String(message._id), message]));
      setMessages((prev) =>
        prev.map((message) => {
          const updatedMessage = updatesById.get(String(message._id));
          return updatedMessage ? { ...message, ...updatedMessage } : message;
        }),
      );
    };

    const handleMessageHistory = async ({ conversationId: historyConversationId, messages: nextMessages }) => {
      if (String(historyConversationId) !== String(conversationId)) {
        return;
      }
      const decryptedMessages = await Promise.all(
        (nextMessages || []).map((message) => decryptSingleMessage(message)),
      );
      setMessages(decryptedMessages);
    };

    const handleNewMessage = async (data) => {
      const actualMessage = data.message || data;
      const incomingConversationId =
        actualMessage.conversationId?._id || actualMessage.conversationId || data.conversationId;
      if (String(incomingConversationId) === String(conversationId)) {
        const decryptedMessage = await decryptSingleMessage(actualMessage);
        setMessages((prev) => {
          if (prev.some((message) => String(message._id) === String(decryptedMessage._id))) {
            return prev;
          }
          return [...prev, decryptedMessage];
        });
      }
    };

    socket.on("conversations_list", handleConversationsList);
    socket.on("conversation_started", handleConversationStarted);
    socket.on("group_created", handleGroupCreated);
    socket.on("unread_count_updated", handleUnreadCountUpdated);
    socket.on("conversation_updated", handleConversationUpdated);
    socket.on("messages_delivered", handleMessagesDelivered);
    socket.on("messages_read", handleMessagesRead);
    socket.on("message_history", handleMessageHistory);
    socket.on("new_message", handleNewMessage);

    socket.emit("get_conversations");

    return () => {
      socket.off("conversations_list", handleConversationsList);
      socket.off("conversation_started", handleConversationStarted);
      socket.off("group_created", handleGroupCreated);
      socket.off("unread_count_updated", handleUnreadCountUpdated);
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("messages_delivered", handleMessagesDelivered);
      socket.off("messages_read", handleMessagesRead);
      socket.off("message_history", handleMessageHistory);
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, currentUser, conversationId, privateKey, encryptionReady]);

  const upsertConversation = (conversation) => {
    setUserList((prev) => {
      const existingIndex = prev.findIndex(
        (entry) => String(entry._id) === String(conversation._id),
      );

      if (existingIndex === -1) {
        return sortConversations([conversation, ...prev]);
      }

      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...conversation };
      return sortConversations(next);
    });
  };

  const saveContact = async (contactEmail, displayName) => {
    if (!currentUser?._id) return null;

    const response = await saveContactApi(currentUser._id, {
      contactEmail,
      displayName,
    });

    setContacts((prev) => {
      const index = prev.findIndex((contact) => String(contact.email) === String(response.data.email));
      if (index === -1) return [...prev, response.data];
      const next = [...prev];
      next[index] = response.data;
      return next;
    });

    return response.data;
  };

  const editContact = async (contactEmail, displayName) => {
    const response = await updateContactApi(currentUser._id, contactEmail, { displayName });
    setContacts((prev) =>
      prev.map((contact) =>
        String(contact.email) === String(contactEmail) ? response.data : contact,
      ),
    );

    if (targetUser?.email && String(targetUser.email) === String(contactEmail)) {
      setTargetUser((prev) => ({ ...prev, savedName: response.data.displayName }));
    }
  };

  const removeContact = async (contactEmail) => {
    await removeContactApi(currentUser._id, contactEmail);
    setContacts((prev) =>
      prev.filter((contact) => String(contact.email) !== String(contactEmail)),
    );

    if (targetUser?.email && String(targetUser.email) === String(contactEmail)) {
      setTargetUser((prev) => (prev ? { ...prev, savedName: prev.username } : prev));
    }
  };

  const startDirectChat = (otherUser, savedName = null) => {
    if (!socket || !otherUser) return;
    setTargetUser({
      ...otherUser,
      savedName: savedName || otherUser.username,
    });

    const existingConversation = userList.find((entry) => {
      if (entry.type !== "direct") return false;
      return entry.participantDetails?.some(
        (participant) => String(participant._id) === String(otherUser._id),
      );
    });

    if (existingConversation) {
      setMessages([]);
      setConversationId(existingConversation._id);
      socket.emit("join_conversation", { conversationId: existingConversation._id });
      return;
    }

    setMessages([]);
    socket.emit("start_direct", { targetUserId: otherUser._id });
  };

  const openConversation = (conversation, customTitle = null) => {
    if (!socket || !conversation) return;

    if (conversation.type === "group") {
      setTargetUser({
        _id: conversation._id,
        username: customTitle || conversation.title || conversation.name,
        savedName: customTitle || conversation.title || conversation.name,
        avatarUrl: conversation.chatAvatarUrl,
        isGroup: true,
        participantDetails: conversation.participantDetails || [],
      });
    } else {
      const otherUser = conversation.participantDetails?.[0];
      if (!otherUser) return;
      setTargetUser({
        ...otherUser,
        savedName: customTitle || conversation.title || otherUser.username,
      });
    }

    setMessages([]);
    setMessageSearchQuery("");
    setConversationId(conversation._id);
    socket.emit("join_conversation", { conversationId: conversation._id });
  };

  const createGroup = (name, participantIds) => {
    if (!socket) return;
    socket.emit("create_group", { name, participantIds });
  };

  const searchChats = (query) => {
    setSearchQuery(query);
    if (!socket) return;
    socket.emit("search_conversations", { query });
  };

  const filteredContacts = useMemo(
    () =>
      contacts.filter((contact) => {
        const haystack = `${contact.displayName} ${contact.user?.username || ""} ${contact.user?.email || ""} ${contact.email || ""}`.toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
      }),
    [contacts, searchQuery],
  );

  const discoverUsers = useMemo(() => {
    const savedEmails = new Set(contacts.map((contact) => String(contact.email).toLowerCase()));
    return allUsers.filter((entry) => {
      const isSelf = String(entry._id) === String(currentUser?._id);
      const isSaved = savedEmails.has(String(entry.email).toLowerCase());
      const haystack = `${entry.username} ${entry.email}`.toLowerCase();
      return !isSelf && !isSaved && haystack.includes(searchQuery.toLowerCase());
    });
  }, [allUsers, contacts, currentUser?._id, searchQuery]);

  const filteredUserList = useMemo(() => {
    return userList.filter((entry) => {
      if (activeChatFilter === "unread") return (entry.unreadCount || 0) > 0;
      if (activeChatFilter === "groups") return entry.type === "group";
      if (activeChatFilter === "favorites") {
        return favoriteConversationIds.includes(String(entry._id));
      }
      return true;
    });
  }, [userList, activeChatFilter, favoriteConversationIds]);

  const toggleFavoriteConversation = (conversationId) => {
    setFavoriteConversationIds((prev) =>
      prev.includes(String(conversationId))
        ? prev.filter((id) => String(id) !== String(conversationId))
        : [...prev, String(conversationId)],
    );
  };

  const selectedChatTheme =
    CHAT_THEMES.find((theme) => theme.id === chatThemeId) || CHAT_THEMES[0];
  const selectedChatWallpaper =
    CHAT_WALLPAPERS.find((wallpaper) => wallpaper.id === chatWallpaperId) ||
    CHAT_WALLPAPERS[0];

  const filteredMessages = useMemo(() => {
    const query = messageSearchQuery.trim().toLowerCase();
    if (!query) return messages;

    return messages.filter((message) => {
      const haystack = [
        message.content,
        message.fileName,
        message.locationLabel,
        message.mapsUrl,
        message.senderId?.username,
        message.sender?.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [messages, messageSearchQuery]);

  return (
    <ChatContext.Provider
      value={{
        conversationId,
        setConversationId,
        messages,
        setMessages,
        filteredMessages,
        targetUser,
        setTargetUser,
        userList,
        filteredUserList,
        setUserList,
        contacts,
        allUsers,
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
        toggleFavoriteConversation,
        chatThemes: CHAT_THEMES,
        chatWallpapers: CHAT_WALLPAPERS,
        chatThemeId,
        setChatThemeId,
        chatWallpaperId,
        setChatWallpaperId,
        selectedChatTheme,
        selectedChatWallpaper,
        messageSearchQuery,
        setMessageSearchQuery,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
