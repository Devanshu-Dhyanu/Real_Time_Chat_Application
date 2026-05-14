import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: String, enum: ['direct', 'group'], default: 'direct' })
  type: string;

  @Prop()
  name: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean
}

export const conversationModel = SchemaFactory.createForClass(Conversation);