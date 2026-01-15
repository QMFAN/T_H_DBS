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
  } catch (error) {
    const trimmed = raw.replace(/\/$/, '');
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 增加请求体大小限制，支持批量操作
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  app.enableCors({
    origin: (origin, callback) => {
      const raw = configService.get<string>('ALLOWED_ORIGINS');
      if (!raw || raw.trim() === '') {
        return callback(null, true);
      }
      const list = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!origin) return callback(null, true);
      if (list.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed`), false);
    },
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3005, '0.0.0.0');
}
bootstrap();
