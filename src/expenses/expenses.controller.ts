import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Patch,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ExpenseBaseDto, ExpenseDto } from './dto';
import {
  PaginatedResponseType,
  PaginatedResponseDto,
  PaginatedRequestDto,
} from '../common/dto';
import { ApiPaginationQuery } from '../common/decorators';

@ApiTags('expenses')
@ApiCookieAuth()
@Controller('expenses')
@UseGuards(SessionAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all expenses for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of expenses for the user',
    type: PaginatedResponseType(ExpenseDto),
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiPaginationQuery()
  async getUserExpenses(
    @Request() req,
    @Query() paginatedRequestDto: PaginatedRequestDto,
  ): Promise<PaginatedResponseDto<ExpenseDto>> {
    return await this.expensesService.getExpenses(
      req.user.id,
      paginatedRequestDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific expense by ID' })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the expense with the specified ID',
    type: ExpenseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async getExpenseDetails(@Param('id') id: string, @Request() req) {
    return await this.expensesService.getExpense(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiBody({ type: ExpenseBaseDto })
  @ApiResponse({
    status: 201,
    description: 'The expense has been successfully created',
    type: ExpenseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createExpenseDto: ExpenseBaseDto, @Request() req) {
    return await this.expensesService.create(createExpenseDto, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing expense' })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
  })
  @ApiBody({ type: ExpenseBaseDto })
  @ApiResponse({
    status: 200,
    description: 'The expense has been successfully updated',
    type: ExpenseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async update(
    @Body() updateExpenseDto: Partial<ExpenseBaseDto>,
    @Request() req,
  ) {
    return await this.expensesService.update(updateExpenseDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
  })
  @ApiResponse({
    status: 200,
    description: 'The expense has been successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.expensesService.remove(id, req.user.id);
    return { message: 'Expense deleted successfully' };
  }
}
