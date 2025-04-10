import {
  BadRequestException,
  Body,
  Controller,
  Request,
  Logger,
  Post,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiBody } from '@nestjs/swagger';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);
  public constructor(private readonly aiService: AiService) {}

  @ApiBody({
    description: 'Expense description text and user ID',
    type: String,
  })
  @Post('parse-expense')
  async parseExpense(@Body() body: { text: string }) {
    try {
      console.log('Parsing expense text:', body.text);
      return await this.aiService.parseExpenseText(body.text);
    } catch (error) {
      this.logger.error(`Error parsing expense: ${error.message}`);
      throw new BadRequestException('Failed to parse expense text');
    }
  }
}
