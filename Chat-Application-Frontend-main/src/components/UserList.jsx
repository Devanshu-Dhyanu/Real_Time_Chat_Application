import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";

export default function UserList() {
    const { socket, onlineUsers } = useSocket();
    const { setConversationId, setTargetUser, targetUser, userList } = useChat();
    const { user: currentUser, logout } = useAuth();

    useEffect(() => {
        if (!socket) return;
        const handleStarted = ({ conversation }) => {
            setConversationId(conversation._id);
        };
        socket.on("conversation_started", handleStarted);
        return () => socket.off("conversation_started", handleStarted);
    }, [socket, setConversationId]);

    const handleClick = (entry) => {
        const otherUser = entry.participantDetails?.[0];
        if (!otherUser) return;

        setTargetUser(otherUser);

        if (entry.convId) {
            setConversationId(entry.convId);
            socket.emit("join_conversation", { conversationId: entry.convId });
        } else {
            socket.emit("start_direct", { targetUserId: otherUser._id });
        }
    };

    return (
        <div className="sidebar">
            {/* HEADER */}
            <div className="sidebar-header">
                <div className="avatar-container">
                    <div className="avatar" style={{ background: 'var(--accent-green)' }}>
                        {currentUser?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className={`status-dot ${onlineUsers.includes(currentUser?._id) ? 'online' : ''}`} />
                </div>
                <div style={{ flex: 1, marginLeft: '10px', fontWeight: '600' }}>
                    {currentUser?.username} (Me)
                </div>
                <button
                    onClick={logout}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    Logout
                </button>
            </div>

            <div style={{ padding: '15px', color: 'var(--accent-green)', fontSize: '0.9rem', fontWeight: '600' }}>
                CHATS
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {userList.map((entry, index) => {
                    const otherUser = entry.participantDetails?.[0];
                    if (!otherUser) return null;

                    const isOnline = onlineUsers.includes(String(otherUser._id));
                    const isActive = String(targetUser?._id) === String(otherUser._id);
                    const unreadCount = isActive ? 0 : (entry.unreadCount || 0);

                    return (
                        <div
                            key={entry.convId || String(otherUser._id)}
                            className={`user-item ${isActive ? 'active' : ''}`}
                            onClick={() => handleClick(entry)}
                        >
                            {/* AVATAR */}
                            <div className="avatar-container">
                                <div className="avatar">
                                    {otherUser.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className={`status-dot ${isOnline ? 'online' : ''}`} />
                            </div>

                            {/* INFO */}
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: '500' }}>{otherUser.username}</div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                    <div style={{
                                        fontSize: '12px',
                                        color: unreadCount > 0 ? 'var(--accent-green)' : 'var(--text-secondary)',
                                        fontWeight: unreadCount > 0 ? '500' : '400',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '150px'
                                    }}>
                                        {entry.lastMessage?.content || ""}
                                    </div>

                                    {unreadCount > 0 && (
                                        <div className="unread-badge">{unreadCount}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
