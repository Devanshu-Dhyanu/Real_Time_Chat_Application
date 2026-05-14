import UserList from "../components/UserList";
import ChatWindow from "../components/Chat/ChatWindow";
import MessageInput from "../components/Chat/MessageInput";

export default function ChatPage() {
    return (
        <div className="app-container">
            <div className="chat-layout">
                <UserList />
                <div className="chat-panel-shell">
                    <ChatWindow />
                    <MessageInput />
                </div>
            </div>
        </div>
    );
}
