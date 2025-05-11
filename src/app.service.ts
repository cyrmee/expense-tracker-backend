import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      name: 'Expense Tracker API',
      version: '1.0.0',
      status: 'online',
      documentation: {
        swagger: '/api/docs',
      },
      description:
        'A feature-rich expense tracker backend API built with NestJS, PostgreSQL, Prisma ORM, and Redis',
      features: [
        'JWT-based authentication with Redis token storage',
        'User management and profile customization',
        'Expense tracking with multi-currency support',
        'Multiple money sources management (cash, bank accounts, credit cards)',
        'Custom and predefined expense categories',
        'Currency conversion with automatic exchange rate updates',
        'AI-powered natural language expense parsing using Gemini AI',
        'Budget tracking and comparison analysis',
        'Expense analytics with trends and spending patterns',
        'Benchmarking against anonymized user spending data',
        'Dashboard with expense overviews and insights',
        'Balance history tracking across money sources',
        'RESTful API with comprehensive Swagger documentation',
      ],
    };
  }
}
