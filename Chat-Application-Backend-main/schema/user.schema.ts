import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class  User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true})
  password: string;

  @Prop({ unique: true, sparse: true, trim: true })
  googleId: string;

  @Prop()
  publicKey: string;

  @Prop()
  avatarUrl: string;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop()
  lastSeen: Date;

  @Prop({default:false})
  isDeleted:boolean

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        email: { type: String, required: true, trim: true, lowercase: true },
        displayName: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  contacts: {
    userId: Types.ObjectId;
    email: string;
    displayName?: string;
    createdAt?: Date;
  }[];
}

export const userModel = SchemaFactory.createForClass(User);
