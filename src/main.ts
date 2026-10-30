import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ versioned API
  app.setGlobalPrefix('v1');

  // ✅ Validation (DTO’lar düzgün çalışsın)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ CORS (origin = frontend)
  app.enableCors({
    origin: ['http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173'],
    credentials: true,
  });

  // ✅ Swagger
  const config = new DocumentBuilder()
    .setTitle('Smart Warehouse API')
    .setDescription('Warehouse / Stock Management API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // ✅ SINGLE listen
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);

  console.log(`🚀 Backend running on http://localhost:${port}/v1`);
  console.log(`📘 Swagger: http://localhost:${port}/docs`);
}

bootstrap();
