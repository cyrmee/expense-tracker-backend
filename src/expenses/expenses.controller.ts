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
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  CreateExpenseDto,
  CreateExpenseFromTextDto,
  ExpenseBaseDto,
  ExpenseDto,
  ParsedExpenseDto,
  UpdateExpenseDto,
} from './dto';
import {
  PaginatedResponseType,
  PaginatedResponseDto,
  PaginatedRequestDto,
} from '../common/dto';
import { ApiPaginationQuery } from '../common/decorators';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiBody({ type: CreateExpenseDto })
  @ApiResponse({
    status: 201,
    description: 'The expense has been successfully created',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    await this.expensesService.create(createExpenseDto, req.user.id);
    return { message: 'Expense created successfully' };
  }

  @Post('from-text')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new expense from text' })
  @ApiBody({ type: CreateExpenseFromTextDto })
  @ApiResponse({
    status: 201,
    description: 'The expense has been successfully created from text',
    type: ParsedExpenseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createFromText(
    @Body() createExpenseFromTextDto: CreateExpenseFromTextDto,
    @Request() req,
  ) {
    return await this.expensesService.createFromText(
      createExpenseFromTextDto.text,
      req.user.id,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update an existing expense' })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
  })
  @ApiBody({ type: UpdateExpenseDto })
  @ApiResponse({
    status: 204,
    description: 'The expense has been successfully updated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Request() req,
  ) {
    if (!id) {
      throw new NotFoundException('Expense id is required');
    }
    await this.expensesService.update(id, updateExpenseDto, req.user.id);
    return { message: 'Expense updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
  })
  @ApiResponse({
    status: 204,
    description: 'The expense has been successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.expensesService.remove(id, req.user.id);
    return { message: 'Expense deleted successfully' };
  }
}
