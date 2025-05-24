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
  // Configure CORS to allow specific origins, methods, and headers
  app.enableCors({
    origin: true, // Allow production and local frontend
    credentials: true, // Allow credentials
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Allow all methods
    allowedHeaders: 'Content-Type,Authorization', // Allow specific headers
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  });
  logger.log('CORS middleware configured');

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
      deepLinking: true, // Enable deep linking for tags and operations
      layout: 'BaseLayout', // Use the base layout for better customization
      syntaxHighlight: {
        activate: true,
        theme: 'monokai', // Use a better highlighting theme
      },
      displayOperationId: true, // Show operation IDs
    },
    customSiteTitle: 'Expense Tracker API Docs',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 30px 0 }
      .swagger-ui .scheme-container { padding: 15px 0 }
      .swagger-ui .opblock-tag { font-size: 18px }
      .swagger-ui .opblock .opblock-summary-operation-id { font-size: 14px }
    `, // Enhanced CSS styling
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
