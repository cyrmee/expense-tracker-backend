import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportDataResponseDto, ImportDataDto } from './dto';

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Export all user data
   * @param userId The ID of the user whose data to export
   */
  async exportData(userId: string): Promise<ExportDataResponseDto> {
    // Get the user but only include email and name
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get all user expenses
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
    });

    // Get all user categories (including default ones)
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ userId }, { isDefault: true }],
      },
    });

    // Get all user money sources
    const moneySources = await this.prisma.moneySource.findMany({
      where: { userId },
    });

    // Get all user balance histories
    const balanceHistories = await this.prisma.balanceHistory.findMany({
      where: { userId },
    });

    // Get all user monthly budgets
    const monthlyBudgets = await this.prisma.monthlyBudget.findMany({
      where: { userId },
    });

    // Get user app settings
    const appSettings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });

    // Construct the response
    return {
      user,
      expenses,
      categories,
      moneySources,
      balanceHistories,
      monthlyBudgets,
      appSettings,
    };
  }

  /**
   * Import user data from a JSON payload
   * @param userId The ID of the user whose data to update
   * @param data The data to import
   */
  async importData(userId: string, data: ImportDataDto): Promise<void> {
    // Start a transaction to ensure all operations succeed or fail together
    await this.prisma.$transaction(async (tx) => {
      // Update user data (only email and name)
      if (data.user) {
        await tx.user.update({
          where: { id: userId },
          data: {
            email: data.user.email,
            name: data.user.name,
          },
        });
      }

      // Import app settings if provided
      if (data.appSettings) {
        const existingSettings = await tx.appSettings.findUnique({
          where: { userId },
        });

        if (existingSettings) {
          await tx.appSettings.update({
            where: { userId },
            data: {
              ...data.appSettings,
              userId, // Keep the original userId
            },
          });
        } else {
          await tx.appSettings.create({
            data: {
              ...data.appSettings,
              userId,
            },
          });
        }
      }

      // Import money sources
      if (data.moneySources && data.moneySources.length > 0) {
        // First delete existing money sources
        await tx.moneySource.deleteMany({
          where: { userId },
        });

        // Then create new ones
        for (const moneySource of data.moneySources) {
          await tx.moneySource.create({
            data: {
              ...moneySource,
              userId,
              id: moneySource.id || undefined, // Use provided ID or let Prisma generate one
            },
          });
        }
      }

      // Import categories (only user-specific ones, not default ones)
      if (data.categories && data.categories.length > 0) {
        // Delete existing user-specific categories
        await tx.category.deleteMany({
          where: {
            userId,
            isDefault: false,
          },
        });

        // Create new user-specific categories
        for (const category of data.categories) {
          // Skip default categories during import
          if (category.isDefault) continue;

          await tx.category.create({
            data: {
              ...category,
              userId,
              id: category.id || undefined,
            },
          });
        }
      }

      // Import expenses
      if (data.expenses && data.expenses.length > 0) {
        // Delete existing expenses
        await tx.expense.deleteMany({
          where: { userId },
        });

        // Create new expenses
        for (const expense of data.expenses) {
          await tx.expense.create({
            data: {
              ...expense,
              userId,
              date: new Date(expense.date),
              id: expense.id || undefined,
            },
          });
        }
      }

      // Import balance histories
      if (data.balanceHistories && data.balanceHistories.length > 0) {
        // Delete existing balance histories
        await tx.balanceHistory.deleteMany({
          where: { userId },
        });

        // Create new balance histories
        for (const history of data.balanceHistories) {
          await tx.balanceHistory.create({
            data: {
              ...history,
              userId,
              date: new Date(history.date),
              id: history.id || undefined,
            },
          });
        }
      }

      // Import monthly budgets
      if (data.monthlyBudgets && data.monthlyBudgets.length > 0) {
        // Delete existing monthly budgets
        await tx.monthlyBudget.deleteMany({
          where: { userId },
        });

        // Create new monthly budgets
        for (const budget of data.monthlyBudgets) {
          await tx.monthlyBudget.create({
            data: {
              ...budget,
              userId,
              id: budget.id || undefined,
            },
          });
        }
      }
    });
  }
}
