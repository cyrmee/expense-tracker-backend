import { ApiProperty } from '@nestjs/swagger';
import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class DashboardOverviewDto {
  @ApiProperty({
    description: 'Total expenses across all money sources',
    example: 1250.5,
  })
  @Expose()
  totalExpenses: number;

  @ApiProperty({
    description: 'Total budget across all money sources',
    example: 2000,
  })
  @Expose()
  totalBudget: number;

  @ApiProperty({
    description: 'Total current balance across all money sources',
    example: 3500.75,
  })
  @Expose()
  totalBalance: number;

  @ApiProperty({
    description: 'Budget utilization percentage',
    example: 62.5,
  })
  @Expose()
  budgetUtilization: number;
}

@Exclude()
export class ExpenseTrendPoint {
  @ApiProperty({
    description: 'Date of the trend point',
    example: '2025-03-01',
  })
  @Expose()
  date: string;

  @ApiProperty({
    description: 'Total expenses for this period',
    example: 450.75,
  })
  @Expose()
  amount: number;
}

@Exclude()
export class DashboardTrendsDto {
  @ApiProperty({
    description: 'Monthly expense trends',
    type: [ExpenseTrendPoint],
  })
  @Expose()
  monthlyTrends: ExpenseTrendPoint[];

  @ApiProperty({
    description: 'Weekly expense trends',
    type: [ExpenseTrendPoint],
  })
  @Expose()
  weeklyTrends: ExpenseTrendPoint[];
}

@Exclude()
export class CategoryExpenseDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Food & Dining',
  })
  @Expose()
  category: string;

  @ApiProperty({
    description: 'Total expenses in this category',
    example: 450.75,
  })
  @Expose()
  amount: number;

  @ApiProperty({
    description: 'Percentage of total expenses',
    example: 25.5,
  })
  @Expose()
  percentage: number;
}

@Exclude()
export class ExpenseCompositionDto {
  @ApiProperty({
    description: 'Expense breakdown by category',
    type: [CategoryExpenseDto],
  })
  @Expose()
  categoryBreakdown: CategoryExpenseDto[];
}

@Exclude()
export class BudgetComparisonItemDto {
  @ApiProperty({
    description: 'Money source name',
    example: 'Personal Banking',
  })
  @Expose()
  moneySource: string;

  @ApiProperty({
    description: 'Allocated budget',
    example: 1000,
  })
  @Expose()
  budget: number;

  @ApiProperty({
    description: 'Actual expenses',
    example: 850.25,
  })
  @Expose()
  actual: number;

  @ApiProperty({
    description: 'Variance (budget - actual)',
    example: 149.75,
  })
  @Expose()
  variance: number;

  @ApiProperty({
    description: 'Variance percentage',
    example: 14.975,
  })
  @Expose()
  variancePercentage: number;
}

@Exclude()
export class BudgetComparisonDto {
  @ApiProperty({
    description: 'Budget comparison by money source',
    type: [BudgetComparisonItemDto],
  })
  @Expose()
  comparisons: BudgetComparisonItemDto[];

  @ApiProperty({
    description: 'Total budget across all sources',
    example: 2000,
  })
  @Expose()
  totalBudget: number;

  @ApiProperty({
    description: 'Total actual expenses',
    example: 1750.5,
  })
  @Expose()
  totalActual: number;

  @ApiProperty({
    description: 'Overall variance',
    example: 249.5,
  })
  @Expose()
  totalVariance: number;
}

export class TopCategory {
  @ApiProperty({ example: 'Internet' })
  name: string;

  @ApiProperty({ example: 1300 })
  amount: number;

  @ApiProperty({ example: 47.0 })
  percentage: number;
}

export class ExpenseOverview {
  @ApiProperty({ example: 'Summary of your expenses for the selected period' })
  summary: string;

  @ApiProperty({
    example: { total: 2764.52, currency: 'ETB' },
    description: 'Current month expenses',
  })
  thisMonth: { total: number; currency: string };

  @ApiProperty({
    example: { total: 15000.0, currency: 'ETB' },
    description: 'Year to date expenses',
  })
  yearToDate: { total: number; currency: string };

  @ApiProperty({
    type: [TopCategory],
    description: 'Top spending categories',
  })
  topCategories: TopCategory[];
}

export class MoneySourceBalance {
  @ApiProperty({ example: 'cash' })
  id: string;

  @ApiProperty({ example: 'Telebirr' })
  name: string;

  @ApiProperty({ example: 8380 })
  balance: number;

  @ApiProperty({ example: 'ETB' })
  currency: string;

  @ApiProperty({ example: 50.7 })
  percentageChange: number;
}

export class TotalBalance {
  @ApiProperty({ example: 16530.62 })
  totalBalance: number;

  @ApiProperty({ example: 'ETB' })
  currency: string;

  @ApiProperty({
    type: [MoneySourceBalance],
    description: 'List of money sources with their balances',
  })
  moneySources: MoneySourceBalance[];
}
