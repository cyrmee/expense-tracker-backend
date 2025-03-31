import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MoneySourceBaseDto, MoneySourceDto } from './dto';
import { plainToClass } from 'class-transformer';
import { CurrencyConverter } from '../common/utils';
import {
  PaginatedRequestDto,
  PaginatedResponseDto,
  QueryBuilder,
  SortOrder,
} from '../common/dto';

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

  async create(
    data: Omit<MoneySourceBaseDto, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<MoneySourceDto> {
    const moneySource = await this.prisma.moneySource.create({
      data: {
        name: data.name,
        balance: data.balance,
        currency: data.currency,
        icon: data.icon,
        isDefault: data.isDefault,
        budget: data.budget,
        user: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        user: {
          include: {
            appSettings: true,
          },
        },
      },
    });

    await this.prisma.balanceHistory.create({
      data: {
        userId,
        moneySourceId: moneySource.id,
        balance: moneySource.balance,
        currency: moneySource.currency,
        date: new Date(),
      },
    });

    return await this.transformToDto(
      moneySource,
      moneySource.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async update(
    data: Partial<MoneySourceBaseDto>,
    userId: string,
  ): Promise<MoneySourceDto> {
    if (!data.id) throw new BadRequestException('ID is required for update');

    await this.getMoneySource(data.id, userId);

    const updatedMoneySource = await this.prisma.moneySource.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        balance: data.balance,
        currency: data.currency,
        icon: data.icon,
        isDefault: data.isDefault,
        budget: data.budget,
        updatedAt: new Date(),
      },
      include: {
        user: {
          include: {
            appSettings: true,
          },
        },
      },
    });

    return await this.transformToDto(
      updatedMoneySource,
      updatedMoneySource.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async addFunds(
    id: string,
    amount: number,
    userId: string,
  ): Promise<MoneySourceDto> {
    const moneySource = await this.prisma.moneySource.findFirst({
      where: { id, userId },
      include: { user: { include: { appSettings: true } } },
    });

    if (!moneySource) {
      throw new NotFoundException(`Money source with ID ${id} not found`);
    }

    if (amount <= 0) {
      throw new BadRequestException(
        'Amount must be positive when adding funds',
      );
    }

    // Update with new balance
    const newBalance = moneySource.balance + amount;
    const updatedMoneySource = await this.prisma.moneySource.update({
      where: { id },
      data: { balance: newBalance, updatedAt: new Date() },
      include: { user: { include: { appSettings: true } } },
    });

    // Create balance history with new total balance
    await this.prisma.balanceHistory.create({
      data: {
        userId,
        moneySourceId: id,
        balance: newBalance,
        currency: moneySource.currency,
        date: new Date(),
      },
    });

    return await this.transformToDto(
      updatedMoneySource,
      updatedMoneySource.user?.appSettings?.preferredCurrency || 'USD',
    );
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
