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

  @Prop({ type: Object })
  encryptedPayload: Record<string, any>;

  @Prop({ type: Object })
  encryptedKeys: Record<string, string>;

  @Prop({ default: 0 })
  isRead: number;

  @Prop()
  mediaUrl: string;

  @Prop()
  fileName: string;

  @Prop()
  mimeType: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  deliveredTo: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];
}

export const MessageModel = SchemaFactory.createForClass(Message);
