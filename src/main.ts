import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as passport from 'passport';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  PrismaExceptionFilter,
} from './common/filters';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Starting application...');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Origin,X-Requested-With,Content-Type,Accept,Authorization,content-type',
  });

  // Then apply session middleware
  const sessionMiddleware = app.get('SESSION_MIDDLEWARE');
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());
  logger.log('Session and authentication middleware configured');

  // Set up global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  logger.log('Global validation pipe configured');

  // Apply global exception filters
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
  );
  logger.log('Global exception filters applied');

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Expense Tracker API')
    .setDescription('The Expense Tracker API documentation')
    .setVersion('1.0')
    .addTag('auth')
    .addTag('users')
    .addCookieAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('Swagger documentation configured');

  const port = process.env.PORT || 5000;
  await app.listen(port);
  const baseUrl = `http://localhost:${port}`;

  logger.log(`Application is running on: ${baseUrl}`);
  logger.log(`Swagger documentation available at: ${baseUrl}/api/docs`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Failed to start application: ${err.message}`, err.stack);
});
