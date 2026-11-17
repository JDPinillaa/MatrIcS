import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './infrastructure/http/filters/global-exception.filter';

/**
 * Configura pipes globales, CORS y manejador centralizado de excepciones.
 * Se extrae del arranque HTTP para reutilizarse en pruebas de integración.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  return app;
}
