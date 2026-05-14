import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
const log4js = require('log4js');

function getAllowedOrigins() {
  const configuredOrigins = process.env.FRONTEND_URL?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) {
    return configuredOrigins;
  }

  return ['http://localhost:7001', 'http://127.0.0.1:7001'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: getAllowedOrigins(), credentials: true });
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(process.env.PORT ?? 6000);
  console.log(`Application is running on Port ${process.env.PORT}`);
}

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      category: 'console',
    },
    everything: {
      type: 'dateFile',
      pattern: 'yyyy-MM-dd',
      keepFileExt: true,
      maxLogSize: 1024 * 1024 * 5, //1024 * 1024 * 5 = 5M
      backups: 100,
      alwaysIncludePattern: true,
      daysToKeep: 500,
      filename: 'log/oppi-games.log',
    },
  },
  categories: {
    default: {
      // appenders: ['everything', 'console'],
      // level: 'ALL',
      appenders: ['everything'],
      level: 'info',
    },
  },
  pm2: true,
  replaceConsole: true,
});
bootstrap();
