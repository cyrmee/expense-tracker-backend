import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { SpendingComparisonDto } from './dto/spending-comparison.dto';
import { CategoryComparisonDto } from './dto/category-comparison.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class BenchmarkingService {
  private readonly logger = new Logger(BenchmarkingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  /**
   * Compare a user's spending patterns with anonymized data from other users
   */
  async compareSpendingPatterns(
    userId: string,
    monthsToCompare: number = 3,
  ): Promise<SpendingComparisonDto> {
    this.logger.log(`Generating spending comparison for user ${userId}`);

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
      const MINIMUM_USER_COUNT = 3;

      // Early return if not enough users for comparison
      if (comparisonUserCount < MINIMUM_USER_COUNT) {
        this.logger.log(
          `Not enough users (${comparisonUserCount}) for anonymous comparison. Minimum required: ${MINIMUM_USER_COUNT}`,
        );
        return plainToClass(SpendingComparisonDto, {
          insights: [
            'Not enough users to generate spending insights. Try again later when more data is available.',
          ],
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

      // Generate insights based on the comparisons
      const insights = this.generateInsights(
        categoryComparisons,
        overallDifferencePercentage,
      );

      this.logger.log(
        `Generated ${insights.length} spending insights for user ${userId}`,
      );

      return plainToClass(SpendingComparisonDto, {
        insights,
        categoryComparisons,
        overallDifferencePercentage: parseFloat(
          overallDifferencePercentage.toFixed(1),
        ),
        comparisonUserCount,
        userMonthlySpending: parseFloat(userMonthlySpending.toFixed(2)),
        averageMonthlySpending: parseFloat(averageMonthlySpending.toFixed(2)),
        currency: preferredCurrency,
      });
    } catch (error) {
      this.logger.error(
        `Error generating spending comparison for user ${userId}: ${error.message}`,
      );
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
      this.logger.error(
        `Error getting user expenses by category: ${error.message}`,
      );
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
        this.logger.log(
          `Not enough users (${userCount}) for anonymous comparison. Minimum required: ${MINIMUM_USER_COUNT}`,
        );
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
      this.logger.error(
        `Error getting other users' expenses by category: ${error.message}`,
      );
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
   * Generate insights based on the spending comparisons
   */
  private generateInsights(
    categoryComparisons: CategoryComparisonDto[],
    overallDifferencePercentage: number,
  ): string[] {
    const insights: string[] = [];

    // Add insight about overall spending if difference is significant
    if (Math.abs(overallDifferencePercentage) >= 5) {
      if (overallDifferencePercentage < 0) {
        insights.push(
          `Overall, you spend ${Math.abs(overallDifferencePercentage).toFixed(0)}% less than the average user.`,
        );
      } else {
        insights.push(
          `Overall, you spend ${overallDifferencePercentage.toFixed(0)}% more than the average user.`,
        );
      }
    }

    // Add insights for categories with significant differences
    for (const comparison of categoryComparisons) {
      // Only generate insights for significant differences (>10%)
      if (Math.abs(comparison.percentageDifference) >= 10) {
        if (comparison.percentageDifference < 0) {
          insights.push(
            `You spend ${Math.abs(comparison.percentageDifference).toFixed(0)}% less on ${comparison.categoryName} than other users.`,
          );
        } else {
          insights.push(
            `You spend ${comparison.percentageDifference.toFixed(0)}% more on ${comparison.categoryName} than other users.`,
          );
        }
      }
    }

    // Look for categories where the user doesn't spend but others do
    // Remove the arbitrary limit of 2 to include all relevant insights
    const unusedCategories = categoryComparisons.filter(
      (c) => c.userAmount === 0 && c.averageAmount > 20,
    );

    for (const category of unusedCategories) {
      insights.push(
        `Most users spend an average of ${category.averageAmount.toFixed(0)} ${category.currency} on ${category.categoryName}, but you have no expenses in this category.`,
      );
    }

    // Add insight for categories where user has uniquely high spending
    const uniqueHighSpendingCategories = categoryComparisons.filter(
      (c) => c.percentageDifference > 200 && c.userAmount > 50,
    );

    for (const category of uniqueHighSpendingCategories) {
      insights.push(
        `Your ${category.categoryName} spending is significantly higher than most users. Consider reviewing your budget in this category.`,
      );
    }

    // Add insight for top saving categories
    const topSavingCategories = categoryComparisons
      .filter((c) => c.percentageDifference < -30 && c.averageAmount > 30)
      .slice(0, 3);

    if (topSavingCategories.length > 0) {
      const categoryNames = topSavingCategories
        .map((c) => c.categoryName)
        .join(', ');
      insights.push(
        `You're doing well at saving money on: ${categoryNames} compared to other users.`,
      );
    }

    return insights;
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
