import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import {
  PaginatedRequestDto,
  PaginatedResponseDto,
  QueryBuilder,
  SortOrder,
} from '../common/dto';
import { CurrencyConverter } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMoneySourceDto,
  MoneySourceDto,
  UpdateMoneySourceDto,
} from './dto';

@Injectable()
export class MoneySourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverter,
  ) { }

  private async transformToDto(
    moneySource: any,
    preferredCurrency: string,
  ): Promise<MoneySourceDto> {
    const dto = plainToClass(MoneySourceDto, moneySource);

    if (moneySource.currency !== preferredCurrency) {
      const convertedBalance = await this.currencyConverter.convertAmount(
        moneySource.balance,
        moneySource.currency,
        preferredCurrency,
      );
      const convertedBudget = await this.currencyConverter.convertAmount(
        moneySource.budget,
        moneySource.currency,
        preferredCurrency,
      );

      dto.balanceInPreferredCurrency = convertedBalance || undefined;
      dto.budgetInPreferredCurrency = convertedBudget || undefined;
    }

    return dto;
  }

  async getMoneySources(
    userId: string,
    paginatedRequestDto: PaginatedRequestDto,
  ): Promise<PaginatedResponseDto<MoneySourceDto>> {
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
          name: { contains: paginatedRequestDto.search, mode: 'insensitive' },
        },
        {
          currency: {
            contains: paginatedRequestDto.search,
            mode: 'insensitive',
          },
        },
        {
          icon: { contains: paginatedRequestDto.search, mode: 'insensitive' },
        },
      ];
    }

    const sortBy = paginatedRequestDto.sortBy || 'updatedAt';
    const sortOrder = paginatedRequestDto.sortOrder || SortOrder.DESC;
    const orderBy = {
      [sortBy]: sortOrder,
    };

    const moneySources = await this.prisma.moneySource.findMany({
      where: whereConditions,
      include: {
        user: {
          include: {
            appSettings: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize + 1, // Fetch one extra
    });

    const hasMore = moneySources.length > pageSize;
    const sourcesToTransform = hasMore ? moneySources.slice(0, pageSize) : moneySources;

    const data = await Promise.all(
      sourcesToTransform.map((source) =>
        this.transformToDto(
          source,
          source.user?.appSettings?.preferredCurrency || 'USD',
        ),
      ),
    );

    return {
      data,
      hasMore,
      pageSize,
      page,
    };
  }

  async getMoneySource(id: string, userId: string): Promise<MoneySourceDto> {
    const moneySource = await this.prisma.moneySource.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        expenses: true,
        balanceHistories: true,
        user: {
          include: {
            appSettings: true,
          },
        },
      },
    });
    if (!moneySource) {
      throw new NotFoundException(`Money source with ID ${id} not found`);
    }

    return await this.transformToDto(
      moneySource,
      moneySource.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async create(data: CreateMoneySourceDto, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // If setting this money source as default, unset any existing defaults
      if (data.isDefault) {
        await tx.moneySource.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      if (data.budget && data.budget < 0) {
        throw new BadRequestException('Budget cannot be negative');
      }

      // Create data object for the money source
      const createData: any = {
        name: data.name,
        balance: data.balance,
        currency: data.currency,
        icon: data.icon || '💵', // Default icon if not provided
        isDefault: data.isDefault || false,
        budget: data.budget || 0,
        user: {
          connect: {
            id: userId,
          },
        },
      };

      const moneySource = await tx.moneySource.create({
        data: createData,
        include: {
          user: {
            include: {
              appSettings: true,
            },
          },
        },
      });

      await tx.balanceHistory.create({
        data: {
          userId,
          moneySourceId: moneySource.id,
          balance: moneySource.balance,
          amount: moneySource.balance,
          currency: moneySource.currency,
          date: new Date(),
        },
      });
    });
  }

  async update(
    id: string,
    data: UpdateMoneySourceDto,
    userId: string,
  ): Promise<void> {
    if (!id) {
      throw new BadRequestException('ID is required for update');
    }

    await this.getMoneySource(id, userId);

    await this.prisma.$transaction(async (tx) => {
      // If setting this money source as default, unset any existing defaults
      if (data.isDefault) {
        await tx.moneySource.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      // Prepare update data
      const updateData: any = {
        name: data.name,
        balance: data.balance,
        currency: data.currency,
        icon: data.icon,
        isDefault: data.isDefault,
        budget: data.budget,
        updatedAt: new Date(),
      };

      await tx.moneySource.update({
        where: {
          id,
        },
        data: updateData,
        include: {
          user: {
            include: {
              appSettings: true,
            },
          },
        },
      });
    });
  }
  async addFunds(id: string, amount: number, userId: string): Promise<{ reminderForBudget: boolean }> {
    await this.prisma.$transaction(async (tx) => {
      const moneySource = await tx.moneySource.findFirst({
        where: { id, userId },
        include: { user: { include: { appSettings: true } } },
      });

      if (!moneySource) {
        throw new NotFoundException(`Money source with ID ${id} not found`);
      }

      // Update with new balance
      const newBalance = moneySource.balance + amount;
      await tx.moneySource.update({
        where: { id },
        data: { balance: newBalance, updatedAt: new Date() },
        include: { user: { include: { appSettings: true } } },
      });

      // Create balance history with new total balance
      await tx.balanceHistory.create({
        data: {
          userId,
          moneySourceId: id,
          balance: newBalance,
          amount,
          currency: moneySource.currency,
          date: new Date(),
        },
      });
    });

    // We no longer have monthly budgets, but we'll return false to maintain compatibility
    return { reminderForBudget: false };
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getMoneySource(id, userId);

    await this.prisma.moneySource.delete({
      where: {
        id,
      },
    });
  }
}
