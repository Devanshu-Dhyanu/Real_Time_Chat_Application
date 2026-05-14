import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { RedisService } from '../../redis/redis.service';
import { getLogger } from 'log4js';

const logger = getLogger();

function getAllowedOrigins() {
  const configuredOrigins = process.env.FRONTEND_URL?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) {
    return configuredOrigins;
  }

  return ['http://localhost:7001', 'http://127.0.0.1:7001'];
}

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private connectedUsers = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private redisService: RedisService,
  ) {}

  afterInit() {
    this.redisService.subClient.subscribe('chat');

    this.redisService.subClient.on('message', (channel, message) => {
      if (channel !== 'chat') return;

      const data = JSON.parse(message);
      this.server.to(data.conversationId).emit('new_message', data);

      if (data.participants?.length) {
        data.participants.forEach((userId: string) => {
          this.server.to(`user:${userId}`).emit('conversation_updated', {
            conversationId: data.conversationId,
            lastMessage: data.message,
          });
        });
      }
    });
    logger.info('ChatGateway initialized, Redis subscribed');
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }

    this.connectedUsers.set(client.id, userId);
    client.join(`user:${userId}`);
    await this.chatService.setUserOnline(userId, true);
    const deliveredMessages = await this.chatService.markPendingMessagesDeliveredForUser(userId);

    const conversations = await this.chatService.getConversations(userId);
    client.emit('conversations_list', { conversations });

    if (deliveredMessages.length) {
      const deliveredByConversation = new Map<string, any[]>();
      deliveredMessages.forEach((message: any) => {
        const conversationId = String(message.conversationId);
        const existing = deliveredByConversation.get(conversationId) || [];
        existing.push(message);
        deliveredByConversation.set(conversationId, existing);
      });

      deliveredByConversation.forEach((messages, conversationId) => {
        this.server.to(conversationId).emit('messages_delivered', {
          conversationId,
          userId,
          messages,
        });
      });
    }

    client.broadcast.emit('user_online', { userId });
  }

  async handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    this.connectedUsers.delete(client.id);
    await this.chatService.setUserOnline(userId, false);
    this.server.emit('user_offline', { userId, lastSeen: new Date() });
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(client: Socket, payload: { conversationId: string }) {
    client.leave(payload.conversationId);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    client: Socket,
    payload: {
      conversationId: string;
      type?: string;
      participants?: string[];
      encryptedPayload: Record<string, any>;
      encryptedKeys: Record<string, string>;
    },
  ) {
    const senderId = this.connectedUsers.get(client.id);
    if (!senderId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const storedParticipants = await this.chatService.getConversationParticipants(
        payload.conversationId,
      );
      const participants = [...new Set([...(payload.participants || []), ...storedParticipants])];

      const onlineRecipients = participants.filter(
        (participantId) =>
          participantId !== senderId &&
          [...this.connectedUsers.values()].includes(String(participantId)),
      );

      const savedMessage = await this.chatService.saveMessage({
        conversationId: payload.conversationId,
        senderId,
        type: payload.type ?? 'text',
        encryptedPayload: payload.encryptedPayload,
        encryptedKeys: payload.encryptedKeys,
        deliveredTo: onlineRecipients,
      });

      if (participants.length) {
        const recipients = participants.filter((userId) => userId !== senderId);
        const unreadCountsMap = await this.chatService.getUnreadCounts(
          payload.conversationId,
          recipients,
        );

        for (const userId of recipients) {
          this.server.to(`user:${userId}`).emit('unread_count_updated', {
            conversationId: payload.conversationId,
            unreadCount: unreadCountsMap[userId] || 0,
            senderId,
          });
        }
      }

      await this.chatService.publishMessage({
        conversationId: payload.conversationId,
        message: savedMessage,
        participants,
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('start_direct')
  async handleStartDirect(client: Socket, payload: { targetUserId: string }) {
    const myUserId = this.connectedUsers.get(client.id);
    if (!myUserId) return;

    const conversation = await this.chatService.getOrCreateDirectConversation(
      myUserId,
      payload.targetUserId,
    );

    const hydratedConversation = await this.chatService.getConversations(myUserId);
    const fullConversation = hydratedConversation.find(
      (entry: any) => String(entry._id) === String(conversation._id),
    );

    client.join(conversation._id.toString());
    client.emit('conversation_started', { conversation: fullConversation || conversation });
  }

  @SubscribeMessage('create_group')
  async handleCreateGroup(
    client: Socket,
    payload: { name: string; participantIds: string[] },
  ) {
    const ownerUserId = this.connectedUsers.get(client.id);
    if (!ownerUserId) return;

    const conversation = await this.chatService.createGroupConversation(
      ownerUserId,
      payload.name,
      payload.participantIds,
    );

    const participantIds = await this.chatService.getConversationParticipants(
      String(conversation._id),
    );

    for (const participantId of participantIds) {
      const conversations = await this.chatService.getConversations(participantId);
      const fullConversation = conversations.find(
        (entry: any) => String(entry._id) === String(conversation._id),
      );
      this.server.to(`user:${participantId}`).emit('group_created', {
        conversation: fullConversation || conversation,
      });
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(client: Socket, payload: { conversationId: string }) {
    const { conversationId } = payload;
    client.join(conversationId);

    const messages = await this.chatService.getMessages(conversationId);
    client.emit('message_history', { conversationId, messages });

    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    const deliveredMessages = await this.chatService.markConversationDelivered(
      conversationId,
      userId,
    );
    if (deliveredMessages.length) {
      this.server.to(conversationId).emit('messages_delivered', {
        conversationId,
        userId,
        messages: deliveredMessages,
      });
    }
    const updatedMessages = await this.chatService.markAsRead(conversationId, userId);

    this.server.to(conversationId).emit('messages_read', {
      conversationId,
      userId,
      messages: updatedMessages,
    });

    this.server.to(`user:${userId}`).emit('unread_count_updated', {
      conversationId,
      unreadCount: 0,
    });
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(client: Socket, payload: { conversationId: string }) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    const updatedMessages = await this.chatService.markAsRead(payload.conversationId, userId);
    this.server.to(payload.conversationId).emit('messages_read', {
      conversationId: payload.conversationId,
      userId,
      messages: updatedMessages,
    });

    this.server.to(`user:${userId}`).emit('unread_count_updated', {
      conversationId: payload.conversationId,
      unreadCount: 0,
    });
  }

  @SubscribeMessage('search_conversations')
  async handleSearchConversations(client: Socket, payload: { query: string }) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    const conversations = await this.chatService.searchChats(userId, payload.query);
    client.emit('conversations_list', { conversations });
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    const conversations = await this.chatService.getConversations(userId);
    client.emit('conversations_list', { conversations });
  }
}
