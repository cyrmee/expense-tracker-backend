import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { AiService } from '../ai/ai.service';
import {
  PaginatedRequestDto,
  PaginatedResponseDto,
  QueryBuilder,
  SortOrder,
} from '../common/dto';
import { CurrencyConverter } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExpenseDto,
  ExpenseDto,
  ParsedExpenseDto,
  UpdateExpenseDto,
} from './dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverter,
    private readonly aiService: AiService,
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

  async getExpenses(
    userId: string,
    paginatedRequestDto: PaginatedRequestDto,
  ): Promise<PaginatedResponseDto<ExpenseDto>> {
    const page = paginatedRequestDto.page;
    const pageSize = paginatedRequestDto.pageSize;

    // Use QueryBuilder to handle all filter types
    const whereConditions = QueryBuilder.buildWhereCondition(
      paginatedRequestDto,
      userId,
    );

    // Add search conditions
    if (paginatedRequestDto.search) {
      whereConditions['OR'] = [
        {
          notes: { contains: paginatedRequestDto.search, mode: 'insensitive' },
        },
        {
          category: {
            name: { contains: paginatedRequestDto.search, mode: 'insensitive' },
          },
        },
        {
          moneySource: {
            name: { contains: paginatedRequestDto.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const sortBy = paginatedRequestDto.sortBy || 'updatedAt';
    const sortOrder = paginatedRequestDto.sortOrder || SortOrder.DESC;
    const orderBy = {
      [sortBy]: sortOrder,
    };

    const expenses = await this.prisma.expense.findMany({
      where: whereConditions,
      include: {
        moneySource: true,
        category: true,
        user: {
          include: {
            appSettings: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const data = await Promise.all(
      expenses.map((expense) =>
        this.transformToDto(
          expense,
          expense.moneySource.currency,
          expense.user?.appSettings?.preferredCurrency || 'USD',
        ),
      ),
    );

    const totalCount = await this.prisma.expense.count({
      where: whereConditions,
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data,
      totalCount,
      totalPages,
      pageSize,
      page,
    };
  }

  async getExpense(id: string, userId: string): Promise<ExpenseDto> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        moneySource: true,
        category: true,
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

  async create(data: CreateExpenseDto, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          amount: data.amount,
          date: data.date,
          notes: data.notes,
          category: {
            connect: {
              id: data.categoryId,
            },
          },
          moneySource: {
            connect: {
              id: data.moneySourceId,
            },
          },
          user: {
            connect: {
              id: userId,
            },
          },
        },
        include: {
          moneySource: true,
          category: true,
          user: {
            include: {
              appSettings: true,
            },
          },
        },
      });

      await tx.moneySource.update({
        where: { id: expense.moneySourceId },
        data: {
          balance: {
            decrement: expense.amount,
          },
          budget: {
            decrement: expense.amount,
          },
        },
      });
    });

    return;
  }

  async createFromText(
    text: string,
    userId: string,
  ): Promise<ParsedExpenseDto> {
    try {
      const parsedData = await this.aiService.parseExpenseData(text, userId);
      return parsedData;
    } catch (error) {
      throw new NotFoundException(`${error.message}`);
    }
  }

  async update(
    id: string,
    data: UpdateExpenseDto,
    userId: string,
  ): Promise<void> {
    const previousExpense = await this.getExpense(id, userId);

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.date !== undefined) updateData.date = data.date;
      if (data.notes !== undefined) updateData.notes = data.notes;

      if (data.categoryId) {
        updateData.category = {
          connect: { id: data.categoryId },
        };
      }

      if (data.moneySourceId) {
        updateData.moneySource = {
          connect: { id: data.moneySourceId },
        };
      }

      const updatedExpense = await tx.expense.update({
        where: { id },
        data: updateData,
        include: {
          moneySource: true,
          user: {
            include: {
              appSettings: true,
            },
          },
        },
      });

      if (data.amount || data.moneySourceId) {
        // Case 1: Money source has changed - need to restore old balance and deduct from new
        if (
          data.moneySourceId &&
          previousExpense.moneySource.id !== updatedExpense.moneySource.id
        ) {
          // Restore full amount to the old money source
          await tx.moneySource.update({
            where: { id: previousExpense.moneySource.id },
            data: {
              balance: { increment: previousExpense.amount },
            },
          });

          // Deduct new amount from the new money source
          await tx.moneySource.update({
            where: { id: updatedExpense.moneySource.id },
            data: {
              balance: { decrement: updatedExpense.amount },
            },
          });
        }
        // Case 2: Same money source, only amount has changed
        else if (data.amount && previousExpense.amount !== data.amount) {
          const amountDifference = data.amount - previousExpense.amount;

          if (amountDifference > 0) {
            // If new amount is higher, decrease the additional amount from balance
            await tx.moneySource.update({
              where: { id: updatedExpense.moneySource.id },
              data: {
                balance: { decrement: amountDifference },
              },
            });
          } else {
            // If new amount is lower, increase balance by the difference
            await tx.moneySource.update({
              where: { id: updatedExpense.moneySource.id },
              data: {
                balance: { increment: -amountDifference },
              },
            });
          }
        }
      }
    });

    return;
  }

  async remove(id: string, userId: string): Promise<void> {
    const expense = await this.getExpense(id, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.moneySource.update({
        where: { id: expense.moneySource.id },
        data: {
          balance: {
            increment: expense.amount,
          },
        },
      });

      await tx.expense.delete({
        where: {
          id,
        },
      });
    });

    return;
  }
}
