import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseDto } from './dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<ExpenseDto[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
      },
    });
    return expenses.map((expense) => plainToClass(ExpenseDto, expense));
  }

  async findOne(id: string, userId: string): Promise<ExpenseDto> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
    });
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    return plainToClass(ExpenseDto, expense);
  }

  async create(data: any, userId: string): Promise<ExpenseDto> {
    const expense = await this.prisma.expense.create({
      data: {
        ...data,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
    return plainToClass(ExpenseDto, expense);
  }

  async update(id: string, data: any, userId: string): Promise<ExpenseDto> {
    // First check if the expense exists and belongs to the user
    await this.findOne(id, userId);

    const updatedExpense = await this.prisma.expense.update({
      where: {
        id,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return plainToClass(ExpenseDto, updatedExpense);
  }

  async remove(id: string, userId: string): Promise<void> {
    // First check if the expense exists and belongs to the user
    await this.findOne(id, userId);

    await this.prisma.expense.delete({
      where: {
        id,
      },
    });
  }
}
