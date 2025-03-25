import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceHistoryDto } from './dto';
import { Prisma, BalanceHistory } from '@prisma/client';

@Injectable()
export class BalanceHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find all balance history records for a specific user
   */
  async findAll(userId: string) {
    return this.prisma.balanceHistory.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Find a specific balance history record by ID
   */
  async findOne(id: string, userId: string) {
    const balanceHistory = await this.prisma.balanceHistory.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!balanceHistory) {
      throw new NotFoundException('Balance history record not found');
    }

    return balanceHistory;
  }

  /**
   * Create a new balance history record
   */
  async create(data: Omit<BalanceHistoryDto, 'id' | 'createdAt'>) {
    return this.prisma.balanceHistory.create({
      data: {
        ...data,
        date: new Date(data.date), // Ensure date is a proper Date object
      },
    });
  }

  /**
   * Update an existing balance history record
   */
  async update(id: string, userId: string, data: Partial<BalanceHistoryDto>) {
    // First check if the record exists and belongs to the user
    await this.findOne(id, userId);

    return this.prisma.balanceHistory.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined, // Only update date if provided
      },
    });
  }

  /**
   * Delete a balance history record
   */
  async remove(id: string, userId: string) {
    // First check if the record exists and belongs to the user
    await this.findOne(id, userId);

    return this.prisma.balanceHistory.delete({
      where: { id },
    });
  }
}
