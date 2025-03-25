import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseDto } from './dto';
import { plainToClass } from 'class-transformer';
import { CurrencyConverter } from '../common/utils';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverter,
  ) {}

  private async transformToDto(
    expense: any,
    moneySourceCurrency: string,
    preferredCurrency: string,
  ): Promise<ExpenseDto> {
    const dto = plainToClass(ExpenseDto, expense);

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

  async findAll(userId: string): Promise<ExpenseDto[]> {
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

  async findOne(id: string, userId: string): Promise<ExpenseDto> {
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
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return await this.transformToDto(
      expense,
      expense.moneySource.currency,
      expense.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async create(data: any, userId: string): Promise<ExpenseDto> {
    const expense = await this.prisma.expense.create({
      data: {
        ...data,
        user: {
          connect: {
            id: userId,
          },
        },
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

    await this.prisma.moneySource.update({
      where: { id: expense.moneySourceId },
      data: {
        balance: {
          decrement: expense.amount,
        },
      },
    });

    return await this.transformToDto(
      expense,
      expense.moneySource.currency,
      expense.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async update(id: string, data: any, userId: string): Promise<ExpenseDto> {
    await this.findOne(id, userId);

    const expense = await this.prisma.expense.update({
      where: {
        id,
      },
      data: {
        ...data,
        updatedAt: new Date(),
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

  async remove(id: string, userId: string): Promise<void> {
    const expense = await this.findOne(id, userId);

    await this.prisma.moneySource.update({
      where: { id: expense.moneySourceId },
      data: {
        balance: {
          increment: expense.amount,
        },
      },
    });

    await this.prisma.expense.delete({
      where: {
        id,
      },
    });
  }
}
