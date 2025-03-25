import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseHistoryDto } from './dto';
import { Prisma, Expense } from '@prisma/client';

@Injectable()
export class ExpenseHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find all expense history records for a specific user
   */
  async findAll(userId: string) {
    return this.prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Find a specific expense record by ID
   */
  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense record not found');
    }

    return expense;
  }

  /**
   * Create a new expense record
   */
  async create(
    data: Omit<ExpenseHistoryDto, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    return this.prisma.expense.create({
      data: {
        ...data,
        date: new Date(data.date), // Ensure date is a proper Date object
      },
    });
  }

  /**
   * Update an existing expense record
   */
  async update(id: string, userId: string, data: Partial<ExpenseHistoryDto>) {
    // First check if the record exists and belongs to the user
    await this.findOne(id, userId);

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined, // Only update date if provided
      },
    });
  }

  /**
   * Delete an expense record
   */
  async remove(id: string, userId: string) {
    // First check if the record exists and belongs to the user
    await this.findOne(id, userId);

    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
