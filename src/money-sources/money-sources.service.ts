import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MoneySourceDto } from './dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class MoneySourcesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<MoneySourceDto[]> {
    const moneySources = await this.prisma.moneySource.findMany({
      where: {
        userId,
      },
    });

    return moneySources.map((source) => plainToClass(MoneySourceDto, source));
  }

  async findOne(id: string, userId: string): Promise<MoneySourceDto> {
    const moneySource = await this.prisma.moneySource.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!moneySource) {
      throw new NotFoundException(`Money source with ID ${id} not found`);
    }

    return plainToClass(MoneySourceDto, moneySource);
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
    });

    return plainToClass(MoneySourceDto, moneySource);
  }

  async update(id: string, data: any, userId: string): Promise<MoneySourceDto> {
    // First check if the money source exists and belongs to the user
    await this.findOne(id, userId);

    const updatedMoneySource = await this.prisma.moneySource.update({
      where: {
        id,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return plainToClass(MoneySourceDto, updatedMoneySource);
  }

  async remove(id: string, userId: string): Promise<void> {
    // First check if the money source exists and belongs to the user
    await this.findOne(id, userId);

    await this.prisma.moneySource.delete({
      where: {
        id,
      },
    });
  }
}
