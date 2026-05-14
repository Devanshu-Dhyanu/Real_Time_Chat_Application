import { Injectable, Logger } from '@nestjs/common';
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
  ) { }

  async setUserOnline(userId: string, isOnline: boolean) {
    return this.userModel.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date(),
    });
  }

 async getConversations(userId: string) {
  const userObjectId = new Types.ObjectId(userId);
  return this.userModel.aggregate([
    {
      $match: {
        _id: { $ne: userObjectId },
      },
    },
    {
      $lookup: {
        from: 'conversations',
        let: { otherUserId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$type', 'direct'] },
                  { $in: [userObjectId, '$participants'] },
                  { $in: ['$$otherUserId', '$participants'] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: 'conversation',
      },
    },
    {
      $lookup: {
        from: 'messages',
        let: {
          convId: { $arrayElemAt: ['$conversation._id', 0] },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$conversationId', '$$convId'],
              },
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $limit: 1,
          },
        ],
        as: 'lastMessage',
      },
    },
    {
      $lookup: {
        from: 'messages',
        let: {
          convId: { $arrayElemAt: ['$conversation._id', 0] },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$conversationId', '$$convId'] },
                  { $eq: ['$isRead', 0] },
                  { $ne: ['$senderId', userObjectId] },
                ],
              },
            },
          },
          {
            $count: 'count',
          },
        ],
        as: 'unreadData',
      },
    },
    {
      $addFields: {
        convId: {
          $arrayElemAt: ['$conversation._id', 0],
        },
        conversationUpdatedAt: {
          $arrayElemAt: ['$conversation.updatedAt', 0],
        },
        lastMessage: {
          $arrayElemAt: ['$lastMessage', 0],
        },
        unreadCount: {
          $ifNull: [
            {
              $arrayElemAt: ['$unreadData.count', 0],
            },
            0,
          ],
        },
        participantDetails: [
          {
            _id: '$_id',
            username: '$username',
            isOnline: '$isOnline',
          },
        ],
      },
    },
    {
      $project: {
        password: 0,
        conversation: 0,
        unreadData: 0,
      },
    },
    {
      $sort: {
        conversationUpdatedAt: -1,
      },
    },
  ]);
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

  async saveMessage(data: {
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
  }) {
    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(data.conversationId),
      senderId: new Types.ObjectId(data.senderId),
      content: data.content,
      type: data.type,
      isRead: 0,
    });

    await this.conversationModel.findByIdAndUpdate(data.conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    return message;
  }

  async getMessages(conversationId: string) {
    return this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();
  }

  async markAsRead(conversationId: string, userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    return this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: userObjectId },
        isRead: 0,
      },
      { $set: { isRead: 1 } },
    );
  }

  async getUnreadCounts(conversationId: string, recipients: string[]) {
    const counts: Record<string, number> = {};
    for (const userId of recipients) {
      const count = await this.messageModel.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        isRead: 0,
      });
      logger.info(`Unread count for user ${userId}: ${count}`);
      counts[userId] = count;
    }
    logger.info(`Unread counts`, counts);
    return counts;
  }

  async publishMessage(data: any) {
    await this.redisService.pubClient.publish('chat', JSON.stringify(data));
  }
}