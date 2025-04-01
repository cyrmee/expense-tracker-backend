import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): object {
    this.logger.log('API status endpoint accessed');
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
        'Session-based authentication with Redis storage',
        'Role-based access control',
        'User management',
        'Expense tracking features (transactions, budgets, reports)',
        'REST API support',
      ],
    };
  }
}
