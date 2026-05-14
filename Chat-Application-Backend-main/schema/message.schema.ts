import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  content: string;

  @Prop({ default: 'text' })
  type: string;

  @Prop({ default: 0 })
  isRead: number;
}

export const MessageModel = SchemaFactory.createForClass(Message);