import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { mappingInit } from './contract';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  await mappingInit();
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(4000);
}
bootstrap();
