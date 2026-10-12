import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { json, static as serveStatic, text } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as typeof import('cookie-parser');
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './landings/landings.controller';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const landing = process.env.LANDING_URL || 'http://localhost:5173';
  const admin = process.env.ADMIN_URL || 'http://localhost:5174';

  app.enableCors({
    origin: [
      landing,
      admin,
      'http://localhost:5173',
      'http://localhost:5174',
      'https://ilimbooks.uz',
      'https://www.ilimbooks.uz',
      'https://admin.ilimbooks.uz',
    ],
    credentials: true,
  });

  app.use(
    '/api/uploads',
    serveStatic(UPLOAD_DIR, {
      dotfiles: 'deny',
      index: false,
      immutable: true,
      maxAge: '365d',
    }),
  );
  app.use(cookieParser());
  app.use(json({ limit: '256kb' }));
  app.use(text({ type: ['text/plain', 'text/*'], limit: '256kb' }));

  const port = Number(process.env.PORT || 3040);
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on :${port}`);
}
bootstrap();
