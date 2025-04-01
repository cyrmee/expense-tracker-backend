import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import {
  DashboardOverviewDto,
  DashboardTrendsDto,
  ExpenseCompositionDto,
  BudgetComparisonDto,
  CategoryExpenseDto,
  BudgetComparisonItemDto,
  ExpenseOverview,
  TotalBalance,
} from './dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async getOverview(userId: string): Promise<DashboardOverviewDto> {
    this.logger.log(`Generating dashboard overview for user ${userId}`);

    // Get total expenses
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      include: { moneySource: true },
    });

    // Get total budget and balance from money sources
    const moneySources = await this.prisma.moneySource.findMany({
      where: { userId },
    });

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);
    this.logger.log(
      `Using preferred currency: ${preferredCurrency} for dashboard overview`,
    );

    // Convert and calculate total expenses
    let totalExpenses = 0;
    for (const expense of expenses) {
      const fromCurrency = expense.moneySource.currency;
      const convertedAmount = await this.exchangeRatesService.convertAmount(
        expense.amount,
        fromCurrency,
        preferredCurrency,
      );
      totalExpenses += convertedAmount;
    }

    // Convert and calculate total budget and balance
    let totalBudget = 0;
    let totalBalance = 0;
    for (const source of moneySources) {
      const fromCurrency = source.currency;
      const convertedBudget = await this.exchangeRatesService.convertAmount(
        source.budget,
        fromCurrency,
        preferredCurrency,
      );
      const convertedBalance = await this.exchangeRatesService.convertAmount(
        source.balance,
        fromCurrency,
        preferredCurrency,
      );
      totalBudget += convertedBudget;
      totalBalance += convertedBalance;
    }

    const budgetUtilization =
      totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    this.logger.log(
      `Dashboard overview generated for user ${userId}: expenses=${totalExpenses.toFixed(2)}, ` +
        `budget=${totalBudget.toFixed(2)}, balance=${totalBalance.toFixed(2)}, ` +
        `utilization=${budgetUtilization.toFixed(2)}% in ${preferredCurrency}`,
    );

    return plainToClass(DashboardOverviewDto, {
      totalExpenses,
      totalBudget,
      totalBalance,
      budgetUtilization,
    });
  }

  async getTrends(userId: string): Promise<DashboardTrendsDto> {
    this.logger.log(`Generating expense trends for user ${userId}`);

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);
    this.logger.log(
      `Using preferred currency: ${preferredCurrency} for trends analysis`,
    );

    // Get all expenses for the year with money source for currency conversion
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startOfYear,
        },
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        moneySource: true,
      },
    });

    this.logger.log(
      `Processing ${expenses.length} expenses for trends analysis`,
    );

    // Group expenses by month and week
    const monthlyTrends: Map<string, number> = new Map();
    const weeklyTrends: Map<string, number> = new Map();

    // Process each expense with currency conversion
    for (const expense of expenses) {
      const date = new Date(expense.date);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      const weekKey = this.getWeekNumber(date);

      // Convert amount to preferred currency
      const convertedAmount = await this.exchangeRatesService.convertAmount(
        expense.amount,
        expense.moneySource.currency,
        preferredCurrency,
      );

      // Update trends
      monthlyTrends.set(
        monthKey,
        (monthlyTrends.get(monthKey) || 0) + convertedAmount,
      );
      weeklyTrends.set(
        weekKey,
        (weeklyTrends.get(weekKey) || 0) + convertedAmount,
      );
    }

    this.logger.log(
      `Trends analysis completed for user ${userId}: ${monthlyTrends.size} monthly data points, ${weeklyTrends.size} weekly data points`,
    );

    return plainToClass(DashboardTrendsDto, {
      monthlyTrends: Array.from(monthlyTrends.entries()).map(
        ([date, amount]) => ({
          date,
          amount,
        }),
      ),
      weeklyTrends: Array.from(weeklyTrends.entries()).map(
        ([date, amount]) => ({
          date,
          amount,
        }),
      ),
    });
  }

  async getExpenseComposition(userId: string): Promise<ExpenseCompositionDto> {
    this.logger.log(
      `Generating expense composition analysis for user ${userId}`,
    );

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);
    this.logger.log(
      `Using preferred currency: ${preferredCurrency} for expense composition`,
    );

    // Get all expenses with their categories and money source for currency conversion
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      include: {
        category: true,
        moneySource: true,
      },
    });

    this.logger.log(
      `Analyzing ${expenses.length} expenses for category breakdown`,
    );

    // Convert and calculate total expenses
    let totalExpenses = 0;
    const categoryMap = new Map<string, number>();

    // Process each expense with currency conversion
    for (const expense of expenses) {
      const convertedAmount = await this.exchangeRatesService.convertAmount(
        expense.amount,
        expense.moneySource.currency,
        preferredCurrency,
      );

      totalExpenses += convertedAmount;

      // Group expenses by category
      const categoryName = expense.category.name;
      categoryMap.set(
        categoryName,
        (categoryMap.get(categoryName) || 0) + convertedAmount,
      );
    }

    // Convert to DTO format with percentages
    const categoryBreakdown: CategoryExpenseDto[] = Array.from(
      categoryMap.entries(),
    ).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }));

    this.logger.log(
      `Expense composition analysis complete: identified ${categoryMap.size} categories`,
    );

    return plainToClass(ExpenseCompositionDto, {
      categoryBreakdown,
    });
  }

  async getBudgetComparison(userId: string): Promise<BudgetComparisonDto> {
    this.logger.log(`Generating budget comparison for user ${userId}`);

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);
    this.logger.log(
      `Using preferred currency: ${preferredCurrency} for budget comparison`,
    );

    // Get all money sources with their expenses
    const moneySources = await this.prisma.moneySource.findMany({
      where: { userId },
      include: {
        expenses: true,
      },
    });

    this.logger.log(
      `Analyzing ${moneySources.length} money sources for budget comparison`,
    );

    let totalBudget = 0;
    let totalActual = 0;

    // Calculate comparisons for each money source with currency conversion
    const comparisons: BudgetComparisonItemDto[] = [];

    for (const source of moneySources) {
      const sourceCurrency = source.currency;

      // Convert budget to preferred currency
      const convertedBudget = await this.exchangeRatesService.convertAmount(
        source.budget,
        sourceCurrency,
        preferredCurrency,
      );

      // Calculate and convert actual expenses
      let actualInSourceCurrency = 0;
      for (const expense of source.expenses) {
        actualInSourceCurrency += expense.amount;
      }

      const convertedActual = await this.exchangeRatesService.convertAmount(
        actualInSourceCurrency,
        sourceCurrency,
        preferredCurrency,
      );

      // Calculate variance
      const variance = convertedBudget - convertedActual;
      const variancePercentage =
        convertedBudget > 0 ? (variance / convertedBudget) * 100 : 0;

      totalBudget += convertedBudget;
      totalActual += convertedActual;

      this.logger.log(
        `Money source ${source.name}: budget=${convertedBudget.toFixed(2)}, actual=${convertedActual.toFixed(2)}, variance=${variance.toFixed(2)} (${variancePercentage.toFixed(1)}%)`,
      );

      comparisons.push({
        moneySource: source.name,
        budget: convertedBudget,
        actual: convertedActual,
        variance,
        variancePercentage,
      });
    }

    const totalVariance = totalBudget - totalActual;

    this.logger.log(
      `Budget comparison complete: total budget=${totalBudget.toFixed(2)}, total actual=${totalActual.toFixed(2)}, total variance=${totalVariance.toFixed(2)}`,
    );

    return plainToClass(BudgetComparisonDto, {
      comparisons,
      totalBudget,
      totalActual,
      totalVariance,
    });
  }

  /**
   * Helper method to get the user's preferred currency
   * @param userId The user ID
   * @returns The preferred currency code (defaults to ETB)
   */
  private async getUserPreferredCurrency(userId: string): Promise<string> {
    const userSettings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });
    return userSettings?.preferredCurrency || 'ETB';
  }

  private getWeekNumber(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
    );
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  async getExpensesOverview(
    userId: string,
    period?: string,
  ): Promise<ExpenseOverview> {
    this.logger.log(
      `Generating expenses overview for user ${userId}, period: ${period || 'this month'}`,
    );

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);
    this.logger.log(
      `Using preferred currency: ${preferredCurrency} for expenses overview`,
    );

    // Get this month's expenses with money source for currency conversion
    const thisMonthExpenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
        },
      },
      include: {
        category: true,
        moneySource: true,
      },
    });

    this.logger.log(
      `Processing ${thisMonthExpenses.length} expenses for current month`,
    );

    // Get year to date expenses with money source for currency conversion
    const yearToDateExpenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startOfYear,
        },
      },
      include: {
        category: true,
        moneySource: true,
      },
    });

    this.logger.log(
      `Processing ${yearToDateExpenses.length} expenses for year-to-date`,
    );

    // Calculate converted totals
    let thisMonthTotal = 0;
    let yearToDateTotal = 0;

    // Process and convert this month's expenses
    const categoryTotals: Record<string, number> = {};
    for (const expense of thisMonthExpenses) {
      const convertedAmount = await this.exchangeRatesService.convertAmount(
        expense.amount,
        expense.moneySource.currency,
        preferredCurrency,
      );

      thisMonthTotal += convertedAmount;

      const categoryName = expense.category.name;
      categoryTotals[categoryName] =
        (categoryTotals[categoryName] || 0) + convertedAmount;
    }

    // Process and convert year-to-date expenses
    for (const expense of yearToDateExpenses) {
      const convertedAmount = await this.exchangeRatesService.convertAmount(
        expense.amount,
        expense.moneySource.currency,
        preferredCurrency,
      );

      yearToDateTotal += convertedAmount;
    }

    // Calculate top categories with converted amounts
    const topCategories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: thisMonthTotal > 0 ? (amount / thisMonthTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((cat) => ({
        ...cat,
        percentage: Number(cat.percentage.toFixed(1)),
      }));

    this.logger.log(
      `Expenses overview generated: monthly total=${thisMonthTotal.toFixed(2)}, YTD total=${yearToDateTotal.toFixed(2)} ${preferredCurrency}`,
    );

    return {
      summary: `Summary of your expenses for ${period || 'this month'}`,
      thisMonth: {
        total: thisMonthTotal,
        currency: preferredCurrency,
      },
      yearToDate: {
        total: yearToDateTotal,
        currency: preferredCurrency,
      },
      topCategories,
    };
  }

  async getTotalBalance(
    userId: string,
    period?: string,
  ): Promise<TotalBalance> {
    this.logger.log(
      `Generating total balance data for user ${userId}, period: ${period || 'this month'}`,
    );

    // Get all money sources for the user
    const moneySources = await this.prisma.moneySource.findMany({
      where: { userId },
    });

    this.logger.log(
      `Processing ${moneySources.length} money sources for balance calculation`,
    );

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);
    this.logger.log(
      `Using preferred currency: ${preferredCurrency} for balance calculation`,
    );

    // Calculate and convert total balance
    let totalBalance = 0;
    for (const source of moneySources) {
      const convertedBalance = await this.exchangeRatesService.convertAmount(
        source.balance,
        source.currency,
        preferredCurrency,
      );
      totalBalance += convertedBalance;
    }

    // Get previous balance history for comparison
    const now = new Date();
    const comparisonDate = new Date(now);
    if (period === 'year-to-date') {
      comparisonDate.setFullYear(comparisonDate.getFullYear() - 1);
      this.logger.log(
        `Using year-to-date comparison (since ${comparisonDate.toISOString().split('T')[0]})`,
      );
    } else {
      comparisonDate.setMonth(comparisonDate.getMonth() - 1);
      this.logger.log(
        `Using month-to-month comparison (since ${comparisonDate.toISOString().split('T')[0]})`,
      );
    }

    const previousBalances = await this.prisma.balanceHistory.findMany({
      where: {
        userId,
        date: {
          gte: comparisonDate,
          lt: new Date(now.setDate(now.getDate() - 1)),
        },
      },
      orderBy: {
        date: 'desc',
      },
      distinct: ['moneySourceId'],
    });

    this.logger.log(
      `Found ${previousBalances.length} historical balance records for comparison`,
    );

    // Calculate percentage changes and convert balances
    const moneySourceDetails: {
      id: string;
      name: string;
      balance: number;
      currency: string;
      percentageChange: number;
    }[] = [];

    for (const source of moneySources) {
      // Convert current balance to preferred currency
      const convertedBalance = await this.exchangeRatesService.convertAmount(
        source.balance,
        source.currency,
        preferredCurrency,
      );

      // Find previous balance and convert if found
      const previousBalance = previousBalances.find(
        (b) => b.moneySourceId === source.id,
      );

      let percentageChange = 0;
      if (previousBalance) {
        // Convert previous balance to preferred currency
        const convertedPreviousBalance =
          await this.exchangeRatesService.convertAmount(
            previousBalance.balance,
            source.currency, // Assume the currency hasn't changed
            preferredCurrency,
          );

        // Calculate percentage change using converted values
        percentageChange =
          convertedPreviousBalance !== 0
            ? ((convertedBalance - convertedPreviousBalance) /
                convertedPreviousBalance) *
              100
            : 0;

        this.logger.log(
          `Money source ${source.name} balance change: ${convertedPreviousBalance.toFixed(2)} → ${convertedBalance.toFixed(2)} (${percentageChange.toFixed(1)}%)`,
        );
      } else {
        this.logger.log(
          `Money source ${source.name}: no previous balance data available for comparison`,
        );
      }

      moneySourceDetails.push({
        id: source.id,
        name: source.name,
        balance: convertedBalance,
        currency: preferredCurrency, // Show in preferred currency
        percentageChange: Number(percentageChange.toFixed(1)),
      });
    }

    this.logger.log(
      `Total balance calculation complete: ${totalBalance.toFixed(2)} ${preferredCurrency}`,
    );

    return {
      totalBalance,
      currency: preferredCurrency,
      moneySources: moneySourceDetails,
    };
  }
}
