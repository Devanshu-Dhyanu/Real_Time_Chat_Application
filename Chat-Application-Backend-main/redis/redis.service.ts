import { Injectable } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService {
  public pubClient: Redis;
  public subClient: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    const tlsEnabled =
      process.env.REDIS_TLS === 'true' || redisUrl?.startsWith('rediss://');

    const redisOptions: RedisOptions = {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      ...(tlsEnabled ? { tls: {} } : {}),
    };

    this.pubClient = redisUrl ? new Redis(redisUrl) : new Redis(redisOptions);
    this.subClient = redisUrl ? new Redis(redisUrl) : new Redis(redisOptions);
  }
}
