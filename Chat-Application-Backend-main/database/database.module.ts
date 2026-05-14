import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { Message, MessageModel } from 'schema/message.schema';
import { Conversation, conversationModel } from 'schema/conversations.schema';
import { User, userModel } from 'schema/user.schema';
dotenv.config();

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        MongooseModule.forRoot(process.env.MONGO_URI as string, {
            autoIndex: true,
        }),
        MongooseModule.forFeature([
            { name: Message.name, schema: MessageModel },
            { name: Conversation.name, schema: conversationModel },
            { name: User.name, schema: userModel },
            
        ]),
    ],
    exports: [MongooseModule],
})
export class DatabaseModule { }