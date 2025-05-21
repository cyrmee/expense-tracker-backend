import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetComparisonDto,
  BudgetComparisonItemDto,
  CategoryExpenseDto,
  DashboardOverviewDto,
  DashboardTrendsDto,
  ExpenseCompositionDto,
  ExpenseOverview,
  TotalBalance,
} from './dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async getOverview(userId: string): Promise<DashboardOverviewDto> {
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

    return plainToClass(DashboardOverviewDto, {
      totalExpenses,
      totalBudget,
      totalBalance,
      budgetUtilization,
    });
  }

  async getTrends(userId: string): Promise<DashboardTrendsDto> {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);

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
    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);

    // Get all expenses with their categories and money source for currency conversion
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      include: {
        category: true,
        moneySource: true,
      },
    });

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

    return plainToClass(ExpenseCompositionDto, {
      categoryBreakdown,
    });
  }

  async getBudgetComparison(userId: string): Promise<BudgetComparisonDto> {
    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);

    // Get all money sources with their expenses
    const moneySources = await this.prisma.moneySource.findMany({
      where: { userId },
      include: {
        expenses: true,
      },
    });

    let totalBudget = 0;
    let totalExpense = 0; // changed from totalActual

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
      let expenseInSourceCurrency = 0; // changed from actualInSourceCurrency
      for (const expense of source.expenses) {
        expenseInSourceCurrency += expense.amount;
      }
      const convertedExpense = await this.exchangeRatesService.convertAmount(
        expenseInSourceCurrency,
        sourceCurrency,
        preferredCurrency,
      );

      // Calculate remaining
      const remaining = convertedBudget - convertedExpense;
      const remainingPercentage =
        convertedBudget > 0 ? (remaining / convertedBudget) * 100 : 0;

      totalBudget += convertedBudget;
      totalExpense += convertedExpense;

      comparisons.push({
        moneySource: source.name,
        budget: convertedBudget,
        expense: convertedExpense, // changed from actual
        remaining,
        remainingPercentage,
      });
    }

    const totalRemaining = totalBudget - totalExpense;

    return plainToClass(BudgetComparisonDto, {
      comparisons,
      totalBudget,
      totalExpense,
      totalRemaining,
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);

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
    // Get all money sources for the user
    const moneySources = await this.prisma.moneySource.findMany({
      where: { userId },
    });

    // Get user's preferred currency
    const preferredCurrency = await this.getUserPreferredCurrency(userId);

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
    } else {
      comparisonDate.setMonth(comparisonDate.getMonth() - 1);
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
      }

      moneySourceDetails.push({
        id: source.id,
        name: source.name,
        balance: convertedBalance,
        currency: preferredCurrency, // Show in preferred currency
        percentageChange: Number(percentageChange.toFixed(1)),
      });
    }

    return {
      totalBalance,
      currency: preferredCurrency,
      moneySources: moneySourceDetails,
    };
  }
}
