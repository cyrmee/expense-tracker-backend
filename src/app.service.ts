import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

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
        'JWT -based authentication with Redis storage',
        'User management',
        'Expense tracking features (transactions, budgets, reports)',
        'REST API support',
      ],
    };
  }
}
