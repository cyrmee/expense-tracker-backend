import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MoneySourceDto } from './dto';
import { plainToClass } from 'class-transformer';
import { CurrencyConverter } from '../common/utils';

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

  async findAll(userId: string): Promise<MoneySourceDto[]> {
    const moneySources = await this.prisma.moneySource.findMany({
      where: { userId },
      include: {
        user: {
          include: {
            appSettings: true,
          },
        },
      },
    });

    const results = await Promise.all(
      moneySources.map((source) =>
        this.transformToDto(
          source,
          source.user?.appSettings?.preferredCurrency || 'USD',
        ),
      ),
    );

    return results;
  }

  async findOne(id: string, userId: string): Promise<MoneySourceDto> {
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

  async create(data: any, userId: string): Promise<MoneySourceDto> {
    const moneySource = await this.prisma.moneySource.create({
      data: {
        ...data,
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

  async update(id: string, data: any, userId: string): Promise<MoneySourceDto> {
    await this.findOne(id, userId);

    const updatedMoneySource = await this.prisma.moneySource.update({
      where: {
        id,
      },
      data: {
        ...data,
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

    await this.prisma.balanceHistory.create({
      data: {
        userId,
        moneySourceId: updatedMoneySource.id,
        balance: updatedMoneySource.balance,
        currency: updatedMoneySource.currency,
        date: new Date(),
      },
    });

    return await this.transformToDto(
      updatedMoneySource,
      updatedMoneySource.user?.appSettings?.preferredCurrency || 'USD',
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.moneySource.delete({
      where: {
        id,
      },
    });
  }
}
