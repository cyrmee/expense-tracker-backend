import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as passport from 'passport';
import { AppModule } from './app.module';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  PrismaExceptionFilter,
  PrismaUnknownExceptionFilter,
} from './common/filters';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Starting application...');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: '*', // Allow all methods
    allowedHeaders: '*', // Allow all headers
    exposedHeaders: '*', // Expose all headers
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Initialize only passport
  app.use(passport.initialize());
  logger.log('JWT authentication middleware configured');

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
    new PrismaUnknownExceptionFilter(),
  );
  logger.log('Global exception filters applied');

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Expense Tracker API')
    .setDescription('The Expense Tracker API documentation')
    .setVersion('1.0')
    .addTag('auth')
    .addTag('users')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('Swagger documentation configured');

  const port = process.env.PORT;
  if (!port) {
    throw new Error('PORT environment variable is not defined');
  }
  await app.listen(port);
  const baseUrl = `http://localhost:${port}`;

  logger.log(`Application is running on: ${baseUrl}`);
  logger.log(`Swagger documentation available at: ${baseUrl}/api/docs`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Failed to start application: ${err.message}`, err.stack);
});
