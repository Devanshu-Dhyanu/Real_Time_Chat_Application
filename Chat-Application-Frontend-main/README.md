# Chat Frontend

React + TypeScript frontend for the NestJS `ChatGateway` WebSocket backend.

## Folder Structure

```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatHeader.tsx        # Conversation header (name, online status, typing)
│   │   ├── ChatWindow.tsx        # Full chat view (header + list + input)
│   │   ├── MessageBubble.tsx     # Individual message with delete, read receipt
│   │   ├── MessageInput.tsx      # Textarea with typing indicator + send
│   │   ├── MessageList.tsx       # Grouped-by-date message list + auto-scroll
│   │   └── TypingIndicator.tsx   # Animated "..." dots
│   ├── Sidebar/
│   │   ├── ConversationItem.tsx  # Single row in the sidebar list
│   │   ├── NewConversationModal.tsx  # Start direct / create group dialog
│   │   └── Sidebar.tsx           # Full sidebar (search + list + footer)
│   └── shared/
│       └── Avatar.tsx            # Reusable avatar with online dot
├── context/
│   └── ChatContext.tsx           # Socket connection, reducer, all actions
├── hooks/
│   └── useTyping.ts              # Debounced typing emit hook
├── services/
│   └── chatSocket.service.ts     # Typed socket.io-client singleton
├── types/
│   └── chat.types.ts             # All TypeScript interfaces
└── utils/
    └── chat.utils.ts             # formatTime, groupMessagesByDate, getInitials…
```

## Socket Events Coverage

| Gateway Event (emit →) | Handled in |
|---|---|
| `send_message` | `MessageInput` → `ChatContext.sendMessage` |
| `start_direct` | `NewConversationModal` → `ChatContext.startDirect` |
| `join_conversation` | `ChatContext.setActiveConversation` |
| `leave_conversation` | `ChatContext.leaveConversation` |
| `create_group` | `NewConversationModal` → `ChatContext.createGroup` |
| `typing` | `useTyping` hook → `ChatContext.sendTyping` |
| `delete_message` | `MessageBubble` → `ChatContext.deleteMessage` |
| `get_conversations` | Auto-called on socket connect |

| Gateway Event (← receive) | Handled in |
|---|---|
| `new_message` | Appends to messages, updates lastMessage |
| `message_history` | Replaces messages for conversation |
| `conversations_list` | Sets sidebar list |
| `conversation_started` | Upserts + activates conversation |
| `conversation_updated` | Updates lastMessage in sidebar |
| `messages_read` | (tracked via readBy on messages) |
| `user_typing` | Shows typing indicator |
| `user_online` / `user_offline` | Updates onlineUsers Set |
| `message_deleted` | Marks message as deleted |
| `group_created` / `added_to_group` | Upserts conversation |

## Setup

```bash
# Install dependencies
npm install

# Configure backend URL
cp .env.example .env
# Edit VITE_SOCKET_URL=http://your-backend:3000

# Start dev server
npm run dev
```

## Build

```bash
npm run build
```
