import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  BudgetComparisonDto,
  DashboardOverviewDto,
  DashboardTrendsDto,
  ExpenseCompositionDto,
  ExpenseOverview,
  TotalBalance,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true }))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview data' })
  @ApiResponse({
    status: 200,
    description: 'Returns aggregated overview data',
    type: DashboardOverviewDto,
  })
  async getOverview(@Request() req): Promise<DashboardOverviewDto> {
    return this.dashboardService.getOverview(req.user.id);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get expense trends data' })
  @ApiResponse({
    status: 200,
    description: 'Returns expense trends analysis',
    type: DashboardTrendsDto,
  })
  async getTrends(@Request() req): Promise<DashboardTrendsDto> {
    return this.dashboardService.getTrends(req.user.id);
  }

  @Get('expense-composition')
  @ApiOperation({ summary: 'Get expense composition by category' })
  @ApiResponse({
    status: 200,
    description: 'Returns breakdown of expenses by category',
    type: ExpenseCompositionDto,
  })
  async getExpenseComposition(@Request() req): Promise<ExpenseCompositionDto> {
    return this.dashboardService.getExpenseComposition(req.user.id);
  }

  @Get('budget-comparison')
  @ApiOperation({ summary: 'Get budget comparison analysis' })
  @ApiResponse({
    status: 200,
    description: 'Returns budget vs actual expense comparison data',
    type: BudgetComparisonDto,
  })
  async getBudgetComparison(@Request() req): Promise<BudgetComparisonDto> {
    return this.dashboardService.getBudgetComparison(req.user.id);
  }

  @Get('expenses-overview')
  @ApiOperation({ summary: 'Get an overview of expenses for the user' })
  @ApiResponse({
    status: 200,
    description: 'Returns an overview of expenses',
    type: ExpenseOverview,
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Period for the overview (e.g., "this-month", "year-to-date")',
  })
  async getExpensesOverview(
    @Query('period') period: string,
    @Request() req,
  ): Promise<ExpenseOverview> {
    return this.dashboardService.getExpensesOverview(req.user.id, period);
  }

  @Get('total-balance')
  @ApiOperation({ summary: 'Get total balance across all money sources' })
  @ApiResponse({
    status: 200,
    description: 'Returns total balance information',
    type: TotalBalance,
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Period for comparing balance changes',
  })
  async getTotalBalance(
    @Query('period') period: string,
    @Request() req,
  ): Promise<TotalBalance> {
    return this.dashboardService.getTotalBalance(req.user.id, period);
  }
}
