import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Allow frontend origins (local and production)
  app.enableCors({
    origin: [
      'http://localhost:3000',      // local frontend
      'http://localhost:3001',      // local backend (if needed)
      'https://pilot-chicken.vercel.app', // production frontend
      '*', // for testing only – remove in production
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = config.get('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();