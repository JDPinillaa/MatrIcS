import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT', '3000'));

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Backend corriendo en http://localhost:${port}`);
  logger.log(`Documentación Swagger disponible en http://localhost:${port}/api/docs`);
}

void bootstrap();
