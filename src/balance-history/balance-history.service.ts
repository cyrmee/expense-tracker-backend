import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceHistoryDto } from './dto';
import { plainToClass } from 'class-transformer';
import { CurrencyConverter } from '../common/utils';

@Injectable()
export class BalanceHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverter,
  ) {}

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
  async findAll(userId: string) {
    const histories = await this.prisma.balanceHistory.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        user: {
          include: {
            appSettings: true,
          },
        },
      },
    });

    const results = await Promise.all(
      histories.map((history) =>
        this.transformToDto(
          history,
          history.user?.appSettings?.preferredCurrency || 'USD',
        ),
      ),
    );

    return results;
  }

  /**
   * Find a specific balance history record by ID
   */
  async findOne(id: string, userId: string) {
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
        ...data,
        date: new Date(data.date), // Ensure date is a proper Date object
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

  /**
   * Update an existing balance history record
   */
  async update(id: string, userId: string, data: Partial<BalanceHistoryDto>) {
    // First check if the record exists and belongs to the user
    await this.findOne(id, userId);

    const history = await this.prisma.balanceHistory.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined, // Only update date if provided
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

  /**
   * Delete a balance history record
   */
  async remove(id: string, userId: string) {
    // First check if the record exists and belongs to the user
    await this.findOne(id, userId);

    return await this.prisma.balanceHistory.delete({
      where: { id },
    });
  }
}
