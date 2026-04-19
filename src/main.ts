import { Logger, UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@redis/client';
import { AppModule } from './app.module';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  PrismaExceptionFilter,
  PrismaUnknownExceptionFilter,
} from './common/filters';
import { PrismaClient } from './generated/prisma/client';

async function checkDependencies(logger: Logger): Promise<void> {
  // Check database connectivity
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.log('Database connection verified');
  } catch (err) {
    logger.error(`Database is not reachable: ${err.message}`);
    throw new Error('Cannot connect to the database. Aborting startup.');
  } finally {
    await prisma.$disconnect();
  }

  // Check Redis connectivity
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not defined. Aborting startup.');
  }
  const redisClient = createClient({ url: redisUrl });

  try {
    await redisClient.connect();
    await redisClient.ping();
    logger.log('Redis connection verified');
  } catch (err) {
    logger.error(`Redis is not reachable: ${err.message}`);
    throw new Error('Cannot connect to Redis. Aborting startup.');
  } finally {
    await redisClient.quit();
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Starting application...');

  await checkDependencies(logger);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  // Configure CORS to allow specific origins, methods, and headers
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  logger.log('CORS middleware configured');

  // Set up global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const fieldErrors: Record<string, string[]> = {};

        const flatten = (errs: any[], parentPath = '') => {
          for (const err of errs) {
            const field = parentPath ? `${parentPath}.${err.property}` : err.property;
            if (err.constraints) {
              fieldErrors[field] = Object.values(err.constraints);
            }
            if (err.children?.length) {
              flatten(err.children, field);
            }
          }
        };

        flatten(errors);

        return new UnprocessableEntityException({
          message: 'Validation failed',
          error: 'Validation Error',
          fields: fieldErrors,
        });
      },
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
    .addTag('auth', 'Authentication operations')
    .addTag('users', 'User management operations')
    .addTag('expenses', 'Expense tracking operations')
    .addTag('categories', 'Expense categories operations')
    .addBearerAuth()
    .build();

  // Configure Swagger with enhanced UI customization and dark mode
  const swaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true, // This enables token persistence
      docExpansion: 'none', // Collapse all docs by default
      filter: true, // Enable filtering
      tagsSorter: 'alpha', // Sort tags alphabetically
      operationsSorter: 'method', // Sort operations by HTTP method
      defaultModelsExpandDepth: 1, // Expand models one level deep
      displayRequestDuration: true, // Show request duration
      tryItOutEnabled: true, // Enable try it out by default
      maxDisplayedTags: null, // Show all tags
      showExtensions: true, // Show vendor extensions
      showCommonExtensions: true, // Show common extensions
      displayOperationId: true, // Show operation IDs
    },
    customSiteTitle: 'Expense Tracker API Docs',
    explorer: true, // Enable the search functionality
  };

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, swaggerCustomOptions);
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
