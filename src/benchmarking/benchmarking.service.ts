import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryComparisonDto } from './dto/category-comparison.dto';
import { SpendingComparisonDto } from './dto/spending-comparison.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class BenchmarkingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Compare a user's spending patterns with anonymized data from other users
   */ async compareSpendingPatterns(
    userId: string,
    monthsToCompare: number = 3,
  ): Promise<SpendingComparisonDto> {
    try {
      // Get the user's preferred currency
      const preferredCurrency = await this.getUserPreferredCurrency(userId);

      // Get current date and calculate date range for comparison (last N months)
      const endDate = new Date();
      // Set to end of current day
      endDate.setHours(23, 59, 59, 999);

      // Create start date exactly N months ago
      const startDate = new Date(endDate);
      startDate.setDate(1); // First day of the month
      startDate.setMonth(startDate.getMonth() - (monthsToCompare - 1)); // Go back N months
      startDate.setHours(0, 0, 0, 0); // Start of day

      // Get user's expenses by category for the last N months
      const userExpenses = await this.getUserExpensesByCategory(
        userId,
        startDate,
        endDate,
        preferredCurrency,
      );

      // Get comparison user count before fetching expenses to avoid unnecessary work
      const comparisonUserCount = await this.getComparisonUserCount(
        userId,
        startDate,
        endDate,
      );

      // Minimum number of users required for anonymized comparison
      const MINIMUM_USER_COUNT = 3; // Early return if not enough users for comparison
      if (comparisonUserCount < MINIMUM_USER_COUNT) {
        return plainToClass(SpendingComparisonDto, {
          insights:
            'Not enough users to generate spending insights. Try again later when more data is available.',
          categoryComparisons: [],
          overallDifferencePercentage: 0,
          comparisonUserCount,
          userMonthlySpending:
            this.calculateTotalSpending(userExpenses) / monthsToCompare,
          averageMonthlySpending: 0,
          currency: preferredCurrency,
        });
      }

      // Get all other users' expenses by category (anonymized)
      const otherUsersExpenses = await this.getOtherUsersExpensesByCategory(
        userId,
        startDate,
        endDate,
        preferredCurrency,
      );

      // Calculate user's monthly spending (total for N months divided by N)
      const userTotalSpending = this.calculateTotalSpending(userExpenses);
      const userMonthlySpending = userTotalSpending / monthsToCompare;

      // Calculate average monthly spending for other users
      const otherUsersTotalSpending =
        this.calculateTotalSpending(otherUsersExpenses);
      const averageMonthlySpending =
        comparisonUserCount > 0
          ? otherUsersTotalSpending / comparisonUserCount / monthsToCompare
          : 0;

      // Calculate overall percentage difference with protection for small amounts
      const MIN_SPENDING_FOR_PERCENTAGE = 10; // Minimum spending to calculate percentage difference
      let overallDifferencePercentage = 0;

      if (averageMonthlySpending >= MIN_SPENDING_FOR_PERCENTAGE) {
        overallDifferencePercentage =
          ((userMonthlySpending - averageMonthlySpending) /
            averageMonthlySpending) *
          100;

        // Cap extreme percentage differences to avoid misleading statistics
        const MAX_PERCENTAGE_DIFFERENCE = 500;
        if (overallDifferencePercentage > MAX_PERCENTAGE_DIFFERENCE) {
          overallDifferencePercentage = MAX_PERCENTAGE_DIFFERENCE;
        } else if (overallDifferencePercentage < -MAX_PERCENTAGE_DIFFERENCE) {
          overallDifferencePercentage = -MAX_PERCENTAGE_DIFFERENCE;
        }
      }

      // Generate category comparisons
      const categoryComparisons = this.generateCategoryComparisons(
        userExpenses,
        otherUsersExpenses,
        comparisonUserCount,
        preferredCurrency,
      );

      // Format numeric values for display
      const formattedUserMonthlySpending = parseFloat(
        userMonthlySpending.toFixed(2),
      );
      const formattedAverageMonthlySpending = parseFloat(
        averageMonthlySpending.toFixed(2),
      );
      const formattedOverallDifferencePercentage = parseFloat(
        overallDifferencePercentage.toFixed(1),
      );

      // Generate AI-powered insights based on the comparisons
      const insights = await this.aiService.generateBenchmarkInsights(userId, {
        categoryComparisons,
        overallDifferencePercentage: formattedOverallDifferencePercentage,
        userMonthlySpending: formattedUserMonthlySpending,
        averageMonthlySpending: formattedAverageMonthlySpending,
        comparisonUserCount,
        currency: preferredCurrency,
      });
      return plainToClass(SpendingComparisonDto, {
        insights,
        categoryComparisons,
        overallDifferencePercentage: formattedOverallDifferencePercentage,
        comparisonUserCount,
        userMonthlySpending: formattedUserMonthlySpending,
        averageMonthlySpending: formattedAverageMonthlySpending,
        currency: preferredCurrency,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's expenses grouped by category within date range
   */
  private async getUserExpensesByCategory(
    userId: string,
    startDate: Date,
    endDate: Date,
    preferredCurrency: string,
  ): Promise<Map<string, number>> {
    try {
      const expenses = await this.prisma.expense.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
          moneySource: true,
        },
      });

      // Group expenses by currency to optimize conversion
      const expensesByCurrency: Record<
        string,
        { amount: number; category: string }[]
      > = {};

      for (const expense of expenses) {
        const currency = expense.moneySource.currency;
        if (!expensesByCurrency[currency]) {
          expensesByCurrency[currency] = [];
        }

        expensesByCurrency[currency].push({
          amount: expense.amount,
          category: expense.category.name,
        });
      }

      const categoryMap = new Map<string, number>();

      // Process each currency group
      for (const [currency, currencyExpenses] of Object.entries(
        expensesByCurrency,
      )) {
        // If currency matches preferred, no conversion needed
        if (currency === preferredCurrency) {
          for (const expense of currencyExpenses) {
            const currentAmount = categoryMap.get(expense.category) || 0;
            categoryMap.set(expense.category, currentAmount + expense.amount);
          }
        } else {
          // Process each expense individually since batch conversion isn't available
          for (const expense of currencyExpenses) {
            const convertedAmount =
              await this.exchangeRatesService.convertAmount(
                expense.amount,
                currency,
                preferredCurrency,
              );

            const currentAmount = categoryMap.get(expense.category) || 0;
            categoryMap.set(expense.category, currentAmount + convertedAmount);
          }
        }
      }

      return categoryMap;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get other users' expenses grouped by category within date range (anonymized)
   */
  private async getOtherUsersExpensesByCategory(
    userId: string,
    startDate: Date,
    endDate: Date,
    preferredCurrency: string,
  ): Promise<Map<string, number>> {
    try {
      // Ensure we have enough users for comparison (privacy protection)
      const userCount = await this.getComparisonUserCount(
        userId,
        startDate,
        endDate,
      );

      // Minimum number of users required for anonymized comparison
      const MINIMUM_USER_COUNT = 3;
      if (userCount < MINIMUM_USER_COUNT) {
        return new Map<string, number>();
      }

      const expenses = await this.prisma.expense.findMany({
        where: {
          userId: { not: userId },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
          moneySource: true,
        },
      });

      // Group expenses by currency to optimize conversion
      const expensesByCurrency: Record<
        string,
        { amount: number; category: string }[]
      > = {};

      for (const expense of expenses) {
        const currency = expense.moneySource.currency;
        if (!expensesByCurrency[currency]) {
          expensesByCurrency[currency] = [];
        }

        expensesByCurrency[currency].push({
          amount: expense.amount,
          category: expense.category.name,
        });
      }

      const categoryMap = new Map<string, number>();

      // Process each currency group
      for (const [currency, currencyExpenses] of Object.entries(
        expensesByCurrency,
      )) {
        // If currency matches preferred, no conversion needed
        if (currency === preferredCurrency) {
          for (const expense of currencyExpenses) {
            const currentAmount = categoryMap.get(expense.category) || 0;
            categoryMap.set(expense.category, currentAmount + expense.amount);
          }
        } else {
          // Process each expense individually since batch conversion isn't available
          for (const expense of currencyExpenses) {
            const convertedAmount =
              await this.exchangeRatesService.convertAmount(
                expense.amount,
                currency,
                preferredCurrency,
              );

            const currentAmount = categoryMap.get(expense.category) || 0;
            categoryMap.set(expense.category, currentAmount + convertedAmount);
          }
        }
      }

      return categoryMap;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get number of users who had expenses in the time period (excluding current user)
   */
  private async getComparisonUserCount(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Count distinct users who had expenses in the period
    const result = await this.prisma.expense.groupBy({
      by: ['userId'],
      where: {
        userId: { not: userId },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return result.length;
  }

  /**
   * Generate category-by-category comparisons
   */
  private generateCategoryComparisons(
    userExpenses: Map<string, number>,
    otherUsersExpenses: Map<string, number>,
    otherUserCount: number,
    currency: string,
  ): CategoryComparisonDto[] {
    const comparisons: CategoryComparisonDto[] = [];

    // Create a set of all category names from both maps
    const allCategories = new Set([
      ...Array.from(userExpenses.keys()),
      ...Array.from(otherUsersExpenses.keys()),
    ]);

    // Minimum amount threshold for significant comparison (to avoid misleading large percentages on small amounts)
    const MINIMUM_AMOUNT_THRESHOLD = 5;

    for (const category of allCategories) {
      const userAmount = userExpenses.get(category) || 0;
      const totalOtherAmount = otherUsersExpenses.get(category) || 0;

      // Calculate the average amount per user for this category
      const averageAmount =
        otherUserCount > 0 ? totalOtherAmount / otherUserCount : 0;

      // Calculate percentage difference with edge case handling
      let percentageDifference = 0;
      if (averageAmount > 0) {
        // Special case: user has no spending but others do
        if (userAmount === 0) {
          percentageDifference = -100; // User spends 100% less
        } else {
          percentageDifference =
            ((userAmount - averageAmount) / averageAmount) * 100;
        }
      } else if (userAmount > 0 && averageAmount === 0) {
        // Special case: user has spending but others don't
        percentageDifference = 100; // User spends more (arbitrary cap at 100%)
      }

      // Only include categories with meaningful comparisons
      const isSignificantUserAmount = userAmount >= MINIMUM_AMOUNT_THRESHOLD;
      const isSignificantAverageAmount =
        averageAmount >= MINIMUM_AMOUNT_THRESHOLD;

      if (isSignificantUserAmount || isSignificantAverageAmount) {
        comparisons.push({
          categoryName: category,
          userAmount: parseFloat(userAmount.toFixed(2)),
          averageAmount: parseFloat(averageAmount.toFixed(2)),
          percentageDifference: parseFloat(percentageDifference.toFixed(1)),
          currency,
        });
      }
    }

    // Sort by absolute percentage difference (largest first)
    return comparisons.sort(
      (a, b) =>
        Math.abs(b.percentageDifference) - Math.abs(a.percentageDifference),
    );
  }

  /**
   * Calculate total spending from a category map
   */
  private calculateTotalSpending(expenses: Map<string, number>): number {
    let total = 0;
    for (const amount of expenses.values()) {
      total += amount;
    }
    return total;
  }

  /**
   * Get user's preferred currency
   */
  private async getUserPreferredCurrency(userId: string): Promise<string> {
    const userSettings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });
    return userSettings?.preferredCurrency || 'ETB';
  }
}
