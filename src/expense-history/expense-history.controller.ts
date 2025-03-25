import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExpenseHistoryService } from './expense-history.service';
import { ExpenseHistoryDto } from './dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';

@ApiTags('expense-history')
@Controller('expense-history')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ExpenseHistoryController {
  constructor(private readonly expenseHistoryService: ExpenseHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all expense history records' })
  @ApiResponse({
    status: 200,
    description: 'Returns all expense history records for the user',
    type: [ExpenseHistoryDto],
  })
  async findAll(@Request() req) {
    return this.expenseHistoryService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense record by id' })
  @ApiResponse({
    status: 200,
    description: 'Returns the expense record',
    type: ExpenseHistoryDto,
  })
  @ApiResponse({ status: 404, description: 'Expense record not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.expenseHistoryService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new expense record' })
  @ApiResponse({
    status: 201,
    description: 'Expense record created successfully',
    type: ExpenseHistoryDto,
  })
  async create(
    @Body()
    expenseHistoryDto: Omit<
      ExpenseHistoryDto,
      'id' | 'createdAt' | 'updatedAt'
    >,
    @Request() req,
  ) {
    return this.expenseHistoryService.create({
      ...expenseHistoryDto,
      userId: req.user.id,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense record' })
  @ApiResponse({
    status: 200,
    description: 'Expense record updated successfully',
    type: ExpenseHistoryDto,
  })
  @ApiResponse({ status: 404, description: 'Expense record not found' })
  async update(
    @Param('id') id: string,
    @Body() expenseHistoryDto: Partial<ExpenseHistoryDto>,
    @Request() req,
  ) {
    return this.expenseHistoryService.update(
      id,
      req.user.id,
      expenseHistoryDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense record' })
  @ApiResponse({
    status: 200,
    description: 'Expense record deleted successfully',
    type: ExpenseHistoryDto,
  })
  @ApiResponse({ status: 404, description: 'Expense record not found' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.expenseHistoryService.remove(id, req.user.id);
  }
}
