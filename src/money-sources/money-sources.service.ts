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
  CardStyleDto,
  CreateMoneySourceDto,
  MoneySourceDto,
  UpdateMoneySourceDto,
} from './dto';

@Injectable()
export class MoneySourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverter,
  ) {}

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

  private async getRandomCardStyleId(): Promise<string | undefined> {
    try {
      const cardStyles = await this.prisma.cardStyle.findMany({
        select: { id: true },
      });

      if (cardStyles.length === 0) {
        return undefined;
      }

      const randomIndex = Math.floor(Math.random() * cardStyles.length);
      return cardStyles[randomIndex].id;
    } catch (error) {
      return undefined;
    }
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
        cardStyle: true,
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const data = await Promise.all(
      moneySources.map((source) =>
        this.transformToDto(
          source,
          source.user?.appSettings?.preferredCurrency || 'USD',
        ),
      ),
    );

    const totalCount = await this.prisma.moneySource.count({
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
  async getMoneySource(id: string, userId: string): Promise<MoneySourceDto> {
    const moneySource = await this.prisma.moneySource.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        expenses: true,
        balanceHistories: true,
        cardStyle: true,
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

      // If cardStyleId is not provided, assign a random one
      let cardStyleId = data.cardStyleId;
      if (!cardStyleId) {
        cardStyleId = await this.getRandomCardStyleId();
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

      // Add card style if available
      if (cardStyleId) {
        createData.cardStyle = {
          connect: {
            id: cardStyleId,
          },
        };
      }

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

    return;
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

      // Handle cardStyleId separately
      if (data.cardStyleId) {
        updateData.cardStyle = {
          connect: {
            id: data.cardStyleId,
          },
        };
      } else if (data.cardStyleId === null) {
        // If explicitly set to null, disconnect the cardStyle
        updateData.cardStyle = {
          disconnect: true,
        };
      }

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

    return;
  }

  async addFunds(id: string, amount: number, userId: string): Promise<void> {
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

    return;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getMoneySource(id, userId);

    await this.prisma.moneySource.delete({
      where: {
        id,
      },
    });

    return;
  }

  /**
   * Get all card styles
   * @returns CardStyleDto[]
   */
  async getCardStyles(): Promise<CardStyleDto[]> {
    try {
      const cardStyles = await this.prisma.cardStyle.findMany();

      return cardStyles.map((style) => plainToClass(CardStyleDto, style));
    } catch (error) {
      throw error;
    }
  }
}
