import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from '../../schema/conversations.schema';
import { Message } from '../../schema/message.schema';
import { User } from '../../schema/user.schema';
import { RedisService } from '../../redis/redis.service';
import { getLogger } from 'log4js';

const logger = getLogger();

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(User.name) private userModel: Model<User>,
    private redisService: RedisService,
  ) {}

  async setUserOnline(userId: string, isOnline: boolean) {
    return this.userModel.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date(),
    });
  }

  async getConversationById(conversationId: string) {
    return this.conversationModel.findById(conversationId).lean();
  }

  async getConversationParticipants(conversationId: string) {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .select('participants')
      .lean();

    return conversation?.participants?.map((entry: any) => String(entry)) || [];
  }

  async getConversations(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const conversations = await this.conversationModel.aggregate([
      {
        $match: {
          participants: userObjectId,
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { participantIds: '$participants' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$_id', '$$participantIds'] },
              },
            },
            {
              $project: {
                password: 0,
                contacts: 0,
              },
            },
          ],
          as: 'participantsData',
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessageData',
        },
      },
      {
        $lookup: {
          from: 'messages',
          let: { convId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$convId'] },
                    { $not: [{ $in: [userObjectId, '$readBy'] }] },
                    { $ne: ['$senderId', userObjectId] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'unreadData',
        },
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$lastMessageData', 0] },
          unreadCount: {
            $ifNull: [{ $arrayElemAt: ['$unreadData.count', 0] }, 0],
          },
          participantDetails: {
            $filter: {
              input: '$participantsData',
              as: 'participant',
              cond: { $ne: ['$$participant._id', userObjectId] },
            },
          },
        },
      },
      {
        $addFields: {
          title: {
            $cond: [
              { $eq: ['$type', 'group'] },
              '$name',
              { $ifNull: [{ $arrayElemAt: ['$participantDetails.username', 0] }, 'Unknown User'] },
            ],
          },
          chatAvatarUrl: {
            $cond: [
              { $eq: ['$type', 'group'] },
              '$avatarUrl',
              { $arrayElemAt: ['$participantDetails.avatarUrl', 0] },
            ],
          },
        },
      },
      {
        $project: {
          lastMessageData: 0,
          unreadData: 0,
          participantsData: 0,
        },
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
    ]);

    return conversations;
  }

  async getOrCreateDirectConversation(user1: string, user2: string) {
    const u1 = new Types.ObjectId(user1);
    const u2 = new Types.ObjectId(user2);

    let conversation = await this.conversationModel.findOne({
      type: 'direct',
      participants: { $all: [u1, u2] },
    });

    if (!conversation) {
      conversation = await this.conversationModel.create({
        type: 'direct',
        participants: [u1, u2],
      });
    }

    return conversation;
  }

  async createGroupConversation(ownerUserId: string, name: string, participantIds: string[]) {
    const uniqueParticipants = [...new Set([ownerUserId, ...participantIds])]
      .filter(Boolean)
      .map((id) => new Types.ObjectId(id));

    if (uniqueParticipants.length < 3) {
      throw new BadRequestException('Group chat needs at least 3 participants including you.');
    }

    return this.conversationModel.create({
      type: 'group',
      name: name.trim(),
      participants: uniqueParticipants,
    });
  }

  async saveMessage(data: {
    conversationId: string;
    senderId: string;
    type: string;
    encryptedPayload: Record<string, any>;
    encryptedKeys: Record<string, string>;
    deliveredTo?: string[];
  }) {
    const senderObjectId = new Types.ObjectId(data.senderId);
    const deliveredTo = (data.deliveredTo || [])
      .filter((id) => id !== data.senderId)
      .map((id) => new Types.ObjectId(id));

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(data.conversationId),
      senderId: senderObjectId,
      content: '',
      type: data.type,
      encryptedPayload: data.encryptedPayload,
      encryptedKeys: data.encryptedKeys,
      mediaUrl: '',
      fileName: '',
      mimeType: '',
      isRead: 0,
      deliveredTo,
      readBy: [senderObjectId],
    });

    await this.conversationModel.findByIdAndUpdate(data.conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    return message.toObject();
  }

  async getMessages(conversationId: string) {
    return this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();
  }

  async markAsDelivered(messageId: string, userId: string) {
    const updated = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          $addToSet: { deliveredTo: new Types.ObjectId(userId) },
        },
        { new: true },
      )
      .lean();

    return updated;
  }

  async markConversationDelivered(conversationId: string, userId: string) {
    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        deliveredTo: { $ne: new Types.ObjectId(userId) },
      },
      {
        $addToSet: { deliveredTo: new Types.ObjectId(userId) },
      },
    );

    return this.messageModel
      .find({
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        deliveredTo: new Types.ObjectId(userId),
      })
      .select('_id conversationId senderId deliveredTo readBy')
      .lean();
  }

  async markPendingMessagesDeliveredForUser(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    await this.messageModel.updateMany(
      {
        senderId: { $ne: userObjectId },
        deliveredTo: { $ne: userObjectId },
      },
      {
        $addToSet: { deliveredTo: userObjectId },
      },
    );

    return this.messageModel
      .find({
        senderId: { $ne: userObjectId },
        deliveredTo: userObjectId,
        readBy: { $ne: userObjectId },
      })
      .select('_id conversationId senderId deliveredTo readBy')
      .lean();
  }

  async markAsRead(conversationId: string, userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: userObjectId },
      },
      {
        $set: { isRead: 1 },
        $addToSet: { readBy: userObjectId, deliveredTo: userObjectId },
      },
    );

    return this.messageModel
      .find({
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: userObjectId },
      })
      .select('_id senderId deliveredTo readBy')
      .lean();
  }

  async getUnreadCounts(conversationId: string, recipients: string[]) {
    const counts: Record<string, number> = {};
    for (const userId of recipients) {
      const count = await this.messageModel.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        readBy: { $ne: new Types.ObjectId(userId) },
      });
      counts[userId] = count;
    }
    logger.info(`Unread counts`, counts);
    return counts;
  }

  async publishMessage(data: any) {
    await this.redisService.pubClient.publish('chat', JSON.stringify(data));
  }

  async searchChats(userId: string, query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    const conversations = await this.getConversations(userId);
    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation: any) => {
      const participantNames = (conversation.participantDetails || [])
        .map((participant: any) => participant.username?.toLowerCase())
        .join(' ');

      return (
        conversation.title?.toLowerCase().includes(normalizedQuery) ||
        participantNames.includes(normalizedQuery)
      );
    });
  }
}
