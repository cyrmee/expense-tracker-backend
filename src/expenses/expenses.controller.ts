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
import { ExpenseDto } from './dto';

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
    description: 'Returns a list of all expenses for the user',
    type: [ExpenseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req) {
    return await this.expensesService.findAll(req.user.id);
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
  async findOne(@Param('id') id: string, @Request() req) {
    return await this.expensesService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiBody({ type: ExpenseDto })
  @ApiResponse({
    status: 201,
    description: 'The expense has been successfully created',
    type: ExpenseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createExpenseDto: any, @Request() req) {
    return await this.expensesService.create(createExpenseDto, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing expense' })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
  })
  @ApiBody({ type: ExpenseDto })
  @ApiResponse({
    status: 200,
    description: 'The expense has been successfully updated',
    type: ExpenseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: any,
    @Request() req,
  ) {
    return await this.expensesService.update(id, updateExpenseDto, req.user.id);
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
