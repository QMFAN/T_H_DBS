import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { basename, join } from 'node:path';
import { AppModule } from './app.module';

function normalizePublicPath(raw?: string): string {
  if (!raw) {
    return '/imports';
  }

  try {
    const url = new URL(raw);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  } catch {
    const trimmed = raw.replace(/\/$/, '');
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const requestBodyLimit = configService.get<string>(
    'REQUEST_BODY_LIMIT',
    '100mb',
  );
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));

  const defaultStorage = join(process.cwd(), 'storage', 'imports');
  const storageDir = configService.get<string>(
    'IMPORT_STORAGE_DIR',
    defaultStorage,
  );
  const publicBaseUrl = configService.get<string>(
    'IMPORT_STORAGE_BASE_URL',
    '/imports',
  );
  const staticPath = normalizePublicPath(publicBaseUrl);

  app.use(
    staticPath,
    express.static(storageDir, {
      setHeaders(res, filePath) {
        const fileName = basename(filePath);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        );
      },
    }),
  );

  const allowedOriginsRaw = configService.get<string>('ALLOWED_ORIGINS');
  const allowedOrigins =
    !allowedOriginsRaw || allowedOriginsRaw.trim() === ''
      ? true
      : allowedOriginsRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
  app.enableCors({ origin: allowedOrigins });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3005, '0.0.0.0');
}
void bootstrap();
