import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseHistoryDto } from './dto';
import { plainToClass } from 'class-transformer';
import { CurrencyConverter } from '../common/utils';

@Injectable()
export class ExpenseHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverter,
  ) {}

  private async transformToDto(
    expense: any,
    moneySourceCurrency: string,
    preferredCurrency: string,
  ): Promise<ExpenseHistoryDto> {
    const dto = plainToClass(ExpenseHistoryDto, expense);

    if (moneySourceCurrency !== preferredCurrency) {
      const convertedAmount = await this.currencyConverter.convertAmount(
        expense.amount,
        moneySourceCurrency,
        preferredCurrency,
      );
      dto.amountInPreferredCurrency = convertedAmount || undefined;
    }

    return dto;
  }

  /**
   * Find all expense history records for a specific user
   */
  async findAll(userId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      include: {
        moneySource: true,
        user: {
          include: {
            appSettings: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const results = await Promise.all(
      expenses.map((expense) =>
        this.transformToDto(
          expense,
          expense.moneySource.currency,
          expense.user?.appSettings?.preferredCurrency || 'USD',
        ),
      ),
    );

    return results;
  }

  /**
   * Find a specific expense record by ID
   */
  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        moneySource: true,
        user: {
          include: {
            appSettings: true,
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense record not found');
    }

    return await this.transformToDto(
      expense,
      expense.moneySource.currency,
      expense.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  /**
   * Create a new expense record
   */
  async create(
    data: Omit<ExpenseHistoryDto, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    const expense = await this.prisma.expense.create({
      data: {
        ...data,
        date: new Date(data.date), // Ensure date is a proper Date object
      },
      include: {
        moneySource: true,
        user: {
          include: {
            appSettings: true,
          },
        },
      },
    });

    return await this.transformToDto(
      expense,
      expense.moneySource.currency,
      expense.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  /**
   * Update an existing expense record
   */
  async update(id: string, userId: string, data: Partial<ExpenseHistoryDto>) {
    // First check if the record exists and belongs to the user
    await this.findOne(id, userId);

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined, // Only update date if provided
      },
      include: {
        moneySource: true,
        user: {
          include: {
            appSettings: true,
          },
        },
      },
    });

    return await this.transformToDto(
      expense,
      expense.moneySource.currency,
      expense.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  /**
   * Delete an expense record
   */
  async remove(id: string, userId: string) {
    // First check if the record exists and belongs to the user
    await this.findOne(id, userId);

    return await this.prisma.expense.delete({
      where: { id },
    });
  }
}
