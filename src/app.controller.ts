import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('general')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns a welcome message',
    schema: {
      type: 'string',
      example: 'Hello from Expense Tracker API!',
    },
  })
  getHello(): object {
    return this.appService.getHello();
  }
}
