import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
  transports: ['websocket', "polling"]
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private connectedUsers = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private redisService: RedisService,
  ) { }

  afterInit() {
    this.redisService.subClient.subscribe('chat');

    this.redisService.subClient.on('message', (channel, message) => {
      if (channel === 'chat') {
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
      }
    });
    logger.info('ChatGateway initialized, Redis subscribed');
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      logger.error(`Client ${client.id} connected without userId, disconnecting`);
      client.disconnect();
      return;
    }

    this.connectedUsers.set(client.id, userId);

    client.join(`user:${userId}`);
    await this.chatService.setUserOnline(userId, true);

    const conversations = await this.chatService.getConversations(userId);
    logger.info(`Conversations for user ${userId}: ${JSON.stringify(conversations)}`);
    const unreadCounts = {};
    conversations.forEach((conv: any) => {
      unreadCounts[conv._id.toString()] = conv.unreadCount || 0;
    });
    client.emit('all_unread_counts', { unreadCounts });

    client.broadcast.emit('user_online', { userId });
    logger.info(`User ${userId} connected — socket: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);

    if (userId) {
      this.connectedUsers.delete(client.id);
      await this.chatService.setUserOnline(userId, false);

      this.server.emit('user_offline', {
        userId,
        lastSeen: new Date(),
      });

      logger.info(`User ${userId} disconnected — socket: ${client.id}`);
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(client: Socket, payload: { conversationId: string }) {
    client.leave(payload.conversationId);
    logger.info(`Socket ${client.id} left conversation ${payload.conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    client: Socket,
    payload: {
      conversationId: string;
      content: string;
      type?: string;
      participants?: string[];
    },
  ) {
    logger.info(`send_message event payload ${payload}`)
    const senderId = this.connectedUsers.get(client.id);
    logger.info(`senderId from send_message event ${senderId}`)
    if (!senderId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const savedMessage = await this.chatService.saveMessage({
        conversationId: payload.conversationId,
        senderId,
        content: payload.content,
        type: payload.type ?? 'text',
      });

      if (payload.participants?.length) {
        const recipients: string[] = [];
        for (const uid of payload.participants) {
          if (uid !== senderId) recipients.push(uid);
        }
        logger.info(`recipients from send_message event ${recipients}`)
        if (recipients.length > 0) {
          const unreadCountsMap = await this.chatService.getUnreadCounts(
            payload.conversationId,
            recipients,
          );
          logger.info(`unreadCountsMap from send_message event ${unreadCountsMap}`)

          for (const userId of recipients) {
            this.server.to(`user:${userId}`).emit('unread_count_updated', {
              conversationId: payload.conversationId,
              unreadCount: unreadCountsMap[userId] || 0,
              senderId,
            });
          }
        }
      }

      await this.chatService.publishMessage({
        conversationId: payload.conversationId,
        message: savedMessage,
        participants: payload.participants ?? [],
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

    client.join(conversation._id.toString());
    logger.info(`Socket client.id === ${client.id} or myUserId ${myUserId}  joined conversation room is ${conversation._id}`);
    client.emit('conversation_started', { conversation });
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(client: Socket, payload: { conversationId: string }) {
    const { conversationId } = payload;
    logger.info(`"conversationId" ${conversationId}`)
    client.join(conversationId.toString());

    const messages = await this.chatService.getMessages(conversationId);
    logger.info(`messages form getMessages method" ${messages}`)
    console.log("messages", messages)
    client.emit('message_history', {
      conversationId,
      messages,
    });

    const userId = this.connectedUsers.get(client.id);
    logger.info(`mark all unread messages as read for this user ==> userId ${userId}`)
    if (userId) {
      await this.chatService.markAsRead(conversationId, userId);
      this.server.to(`user:${userId}`).emit('unread_count_updated', {
        conversationId,
        unreadCount: 0,
      });
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(client: Socket, payload: { conversationId: string }) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    await this.chatService.markAsRead(payload.conversationId, userId);
    this.server.to(`user:${userId}`).emit('unread_count_updated', {
      conversationId: payload.conversationId,
      unreadCount: 0,
    });
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    const conversations = await this.chatService.getConversations(userId);
    logger.info(`"conversations" ${conversations}`)
    client.emit('conversations_list', { conversations });

    const unreadCounts = {};
    conversations.forEach((conv: any) => {
      unreadCounts[conv._id.toString()] = conv.unreadCount || 0;
    });
    client.emit('all_unread_counts', { unreadCounts });
  }
}
