import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ChatGateway } from './chat/chat.gateway';
import { RedisService } from '../redis/redis.service';
import { DatabaseModule } from 'database/database.module';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './services/auth.service';
import { ChatService } from './chat/chat.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
   PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    DatabaseModule,
  ],

  controllers:[
    AuthController
  ],
  providers: [
    AuthService,
    ChatGateway,
    ChatService,
    RedisService,
  ],
})
export class AppModule {}