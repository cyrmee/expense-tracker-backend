import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import {
  PaginatedRequestDto,
  PaginatedResponseDto,
  QueryBuilder,
  SortOrder,
} from '../common/dto';
import { CurrencyConverter } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceHistoryDto } from './dto';

@Injectable()
export class BalanceHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverter,
  ) { }

  private async transformToDto(
    history: any,
    preferredCurrency: string,
  ): Promise<BalanceHistoryDto> {
    const dto = plainToClass(BalanceHistoryDto, history);

    if (history.currency !== preferredCurrency) {
      const convertedBalance = await this.currencyConverter.convertAmount(
        history.balance,
        history.currency,
        preferredCurrency,
      );
      dto.balanceInPreferredCurrency = convertedBalance || undefined;
    }

    return dto;
  }

  /**
   * Find all balance history records for a specific user
   */
  async getBalanceHistories(
    userId: string,
    paginatedRequestDto: PaginatedRequestDto,
  ): Promise<PaginatedResponseDto<BalanceHistoryDto>> {
    const page = paginatedRequestDto.page;
    const pageSize = paginatedRequestDto.pageSize;

    const whereConditions = QueryBuilder.buildWhereCondition(
      paginatedRequestDto,
      userId,
    );

    // Add search conditions
    if (paginatedRequestDto.search) {
      whereConditions['OR'] = [
        {
          currency: {
            contains: paginatedRequestDto.search,
            mode: 'insensitive',
          },
        },
        {
          moneySource: {
            name: { contains: paginatedRequestDto.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const sortBy = paginatedRequestDto.sortBy || 'createdAt';
    const sortOrder = paginatedRequestDto.sortOrder || SortOrder.DESC;
    const orderBy = { [sortBy]: sortOrder };

    // Use the whereConditions in the query
    const histories = await this.prisma.balanceHistory.findMany({
      where: whereConditions,
      include: {
        moneySource: true,
        user: {
          include: {
            appSettings: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize + 1, // Fetch one extra to check if there's more
    });

    const hasMore = histories.length > pageSize;
    const itemsToTransform = hasMore ? histories.slice(0, pageSize) : histories;

    const data = await Promise.all(
      itemsToTransform.map((history) =>
        this.transformToDto(
          history,
          history.user?.appSettings?.preferredCurrency || 'USD',
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

  /**
   * Find a specific balance history record by ID
   */
  async getBalanceHistory(
    id: string,
    userId: string,
  ): Promise<BalanceHistoryDto> {
    const history = await this.prisma.balanceHistory.findFirst({
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
    if (!history) {
      throw new NotFoundException('Balance history record not found');
    }

    return await this.transformToDto(
      history,
      history.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  /**
   * Create a new balance history record
   */
  async create(data: Omit<BalanceHistoryDto, 'id' | 'createdAt'>) {
    const history = await this.prisma.balanceHistory.create({
      data: {
        balance: data.balance,
        amount: data.amount,
        currency: data.currency,
        date: new Date(data.date),
        createdAt: new Date(),
        user: {
          connect: { id: data.userId },
        },
        moneySource: {
          connect: { id: data.moneySourceId },
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

    return await this.transformToDto(
      history,
      history.user?.appSettings?.preferredCurrency || 'USD',
    );
  }
}
