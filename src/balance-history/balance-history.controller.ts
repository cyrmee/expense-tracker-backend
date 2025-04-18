import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BalanceHistoryService } from './balance-history.service';
import { BalanceHistoryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { ApiPaginationQuery } from '../common/decorators';
import { PaginatedRequestDto } from '../common/dto';

@ApiTags('balance-history')
@Controller('balance-history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true }))
export class BalanceHistoryController {
  constructor(private readonly balanceHistoryService: BalanceHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all balance history records' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated balance history records for the user',
    type: [BalanceHistoryDto],
  })
  @ApiPaginationQuery()
  async getBalanceHistories(
    @Request() req,
    @Query() paginatedRequestDto: PaginatedRequestDto,
  ) {
    return await this.balanceHistoryService.getBalanceHistories(
      req.user.id,
      paginatedRequestDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get balance history by id' })
  @ApiResponse({
    status: 200,
    description: 'Returns the balance history record',
    type: BalanceHistoryDto,
  })
  @ApiResponse({ status: 404, description: 'Balance history record not found' })
  async getBalanceHistory(@Param('id') id: string, @Request() req) {
    return await this.balanceHistoryService.getBalanceHistory(id, req.user.id);
  }
}
