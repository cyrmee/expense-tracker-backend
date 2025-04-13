import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseBaseDto, ExpenseDto, ParsedExpenseDto } from './dto';
import { plainToClass } from 'class-transformer';
import { CurrencyConverter } from '../common/utils';
import {
  PaginatedRequestDto,
  PaginatedResponseDto,
  QueryBuilder,
  SortOrder,
} from '../common/dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

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
      this.logger.error(`Expense with ID ${id} not found for user ${userId}`);
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return await this.transformToDto(
      expense,
      expense.moneySource.currency,
      expense.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async create(
    data: Omit<ExpenseBaseDto, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<ExpenseDto> {
    this.logger.log(
      `Creating expense for user ${userId}, category ${data.categoryId}, money source ${data.moneySourceId}, amount ${data.amount}`,
    );

    const expense = await this.prisma.expense.create({
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

    await this.prisma.moneySource.update({
      where: { id: expense.moneySourceId },
      data: {
        balance: {
          decrement: expense.amount,
        },
      },
    });

    this.logger.log(
      `Expense created successfully: ID ${expense.id}, updated money source ${expense.moneySourceId} balance`,
    );

    return await this.transformToDto(
      expense,
      expense.moneySource.currency,
      expense.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async createFromText(
    text: string,
    userId: string,
  ): Promise<ParsedExpenseDto> {
    const parsedData = await this.aiService.parseExpenseData(text, userId);

    if (!parsedData) {
      this.logger.error('Failed to parse expense data from text');
      throw new NotFoundException('Failed to parse expense data');
    }

    return parsedData;
  }

  async update(
    data: Partial<ExpenseBaseDto>,
    userId: string,
  ): Promise<ExpenseDto> {
    if (!data.id) {
      this.logger.error('Expense update failed - missing expense ID');
      throw new NotFoundException('Expense id is required');
    }

    this.logger.log(`Updating expense ${data.id} for user ${userId}`);
    const previousExpense = await this.getExpense(data.id, userId);

    const expense = await this.prisma.expense.update({
      where: {
        id: data.id,
      },
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

    if (typeof data.amount !== 'undefined') {
      // Calculate the differential adjustment
      const amountDifference = data.amount - previousExpense.amount;

      this.logger.log(
        `Expense ${data.id} amount changed by ${amountDifference}, updating money source balances`,
      );

      await this.prisma.$transaction(async (prisma) => {
        if (amountDifference !== 0) {
          await prisma.moneySource.update({
            where: { id: data.moneySourceId },
            data: {
              balance:
                amountDifference > 0
                  ? { decrement: amountDifference }
                  : { increment: Math.abs(amountDifference) },
            },
          });
        }

        // Update the previous money source balance if the money source has changed
        if (previousExpense.moneySource.id !== data.moneySourceId) {
          this.logger.log(
            `Expense ${data.id} money source changed from ${previousExpense.moneySource.id} to ${data.moneySourceId}, adjusting both balances`,
          );

          await prisma.moneySource.update({
            where: { id: previousExpense.moneySource.id },
            data: {
              balance: {
                increment: previousExpense.amount,
              },
            },
          });

          await prisma.moneySource.update({
            where: { id: data.moneySourceId },
            data: {
              balance: {
                decrement: data.amount,
              },
            },
          });
        }
      });
    }

    this.logger.log(`Expense ${data.id} updated successfully`);
    return await this.transformToDto(
      expense,
      expense.moneySource.currency,
      expense.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Removing expense ${id} for user ${userId}`);
    const expense = await this.getExpense(id, userId);

    await this.prisma.moneySource.update({
      where: { id: expense.moneySource.id },
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

    this.logger.log(
      `Expense ${id} removed successfully, money source ${expense.moneySource.id} balance increased by ${expense.amount}`,
    );
  }
}
