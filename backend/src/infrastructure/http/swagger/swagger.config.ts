import * as fs from 'node:fs';
import * as path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import type { Express, Request, Response } from 'express';
import * as yaml from 'js-yaml';
import * as swaggerUi from 'swagger-ui-express';

export const SWAGGER_PATH = '/api/docs';
export const SWAGGER_JSON_PATH = '/api/docs-json';

function resolveOpenApiPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'openapi.yaml'),
    path.resolve(__dirname, '../../../../openapi.yaml'),
    path.resolve(process.cwd(), 'backend', 'openapi.yaml'),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(
      `No se encontró el archivo openapi.yaml en ninguna ruta esperada: ${candidates.join(', ')}`,
    );
  }

  return existing;
}

/**
 * Carga y valida el contrato OpenAPI 3.0 desde `backend/openapi.yaml` como única
 * fuente de verdad para la documentación interactiva.
 */
export function loadOpenApiDocument(): swaggerUi.JsonObject {
  const openApiPath = resolveOpenApiPath();
  const raw = fs.readFileSync(openApiPath, 'utf8');
  const parsed = yaml.load(raw);

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { openapi?: unknown }).openapi !== 'string'
  ) {
    throw new Error(
      `El archivo ${openApiPath} no contiene una especificación OpenAPI válida.`,
    );
  }

  return parsed as swaggerUi.JsonObject;
}

/**
 * Monta Swagger UI en `/api/docs` y expone la especificación JSON en `/api/docs-json`.
 */
export function setupSwagger(app: INestApplication): void {
  const document = loadOpenApiDocument();
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.get(SWAGGER_JSON_PATH, (_req: Request, res: Response) => {
    res.json(document);
  });

  app.use(
    SWAGGER_PATH,
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'MatrIcS API Docs',
      customCss: '',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
}
