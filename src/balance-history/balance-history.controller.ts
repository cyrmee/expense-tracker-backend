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
import { BalanceHistoryService } from './balance-history.service';
import { BalanceHistoryDto } from './dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';

@ApiTags('balance-history')
@Controller('balance-history')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BalanceHistoryController {
  constructor(private readonly balanceHistoryService: BalanceHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all balance history records' })
  @ApiResponse({
    status: 200,
    description: 'Returns all balance history records for the user',
    type: [BalanceHistoryDto],
  })
  async findAll(@Request() req) {
    return this.balanceHistoryService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get balance history by id' })
  @ApiResponse({
    status: 200,
    description: 'Returns the balance history record',
    type: BalanceHistoryDto,
  })
  @ApiResponse({ status: 404, description: 'Balance history record not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.balanceHistoryService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new balance history record' })
  @ApiResponse({
    status: 201,
    description: 'Balance history record created successfully',
    type: BalanceHistoryDto,
  })
  async create(
    @Body() balanceHistoryDto: Omit<BalanceHistoryDto, 'id' | 'createdAt'>,
    @Request() req,
  ) {
    return this.balanceHistoryService.create({
      ...balanceHistoryDto,
      userId: req.user.id,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a balance history record' })
  @ApiResponse({
    status: 200,
    description: 'Balance history record updated successfully',
    type: BalanceHistoryDto,
  })
  @ApiResponse({ status: 404, description: 'Balance history record not found' })
  async update(
    @Param('id') id: string,
    @Body() balanceHistoryDto: Partial<BalanceHistoryDto>,
    @Request() req,
  ) {
    return this.balanceHistoryService.update(
      id,
      req.user.id,
      balanceHistoryDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a balance history record' })
  @ApiResponse({
    status: 200,
    description: 'Balance history record deleted successfully',
    type: BalanceHistoryDto,
  })
  @ApiResponse({ status: 404, description: 'Balance history record not found' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.balanceHistoryService.remove(id, req.user.id);
  }
}
