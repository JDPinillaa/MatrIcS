import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './infrastructure/http/filters/global-exception.filter';
import { setupSwagger } from './infrastructure/http/swagger/swagger.config';

/**
 * Configura pipes globales, CORS, Swagger UI y manejador centralizado de excepciones.
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
  setupSwagger(app);

  return app;
}
