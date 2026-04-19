import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(userId: string) {
    return await this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getCategory(id: string, userId: string) {
    return await this.prisma.category.findFirst({
      where: {
        id,
        OR: [{ isDefault: true }, { userId }],
      },
    });
  }

  async create(data: CreateCategoryDto, userId: string): Promise<void> {
    // Run at Serializable isolation so that a concurrent create with the same
    // name causes one of them to fail rather than both slipping through the
    // application-level duplicate check.
    await this.prisma.$transaction(
      async (tx) => {
        const existingCategory = await tx.category.findFirst({
          where: {
            name: { equals: data.name, mode: 'insensitive' },
            OR: [{ isDefault: true }, { userId }],
          },
        });

        if (existingCategory) {
          throw new BadRequestException(
            `A category with the name ${data.name} already exists`,
          );
        }

        await tx.category.create({
          data: {
            name: data.name,
            icon: data.icon,
            color: data.color,
            user: { connect: { id: userId } },
            isDefault: false,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    return;
  }

  async update(
    id: string,
    data: UpdateCategoryDto,
    userId: string,
  ): Promise<void> {
    if (!id) {
      throw new BadRequestException('Invalid data');
    }

    // Run at Serializable isolation so that a concurrent rename to the same
    // name causes one of them to fail rather than both passing the check.
    await this.prisma.$transaction(
      async (tx) => {
        const category = await tx.category.findFirst({
          where: { id, OR: [{ isDefault: true }, { userId }] },
        });
        if (!category)
          throw new NotFoundException(`Category with ID ${id} not found`);

        if (category.isDefault)
          throw new BadRequestException(
            `Default categories cannot be modified. Please create a new category instead.`,
          );

        if (data.name && data.name !== category.name) {
          const existingCategory = await tx.category.findFirst({
            where: {
              id: { not: id },
              name: { equals: data.name, mode: 'insensitive' },
              OR: [{ isDefault: true }, { userId }],
            },
          });

          if (existingCategory) {
            throw new BadRequestException(
              `A category with the name ${data.name} already exists`,
            );
          }
        }

        await tx.category.update({
          where: { id },
          data: {
            name: data.name,
            icon: data.icon,
            color: data.color,
            updatedAt: new Date(),
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return;
  }

  async remove(id: string, userId: string) {
    const category = await this.getCategory(id, userId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (category.isDefault) {
      throw new BadRequestException(`Default categories cannot be deleted`);
    }

    // Check if the category is referenced by any expenses
    const expenseWithCategory = await this.prisma.expense.findFirst({
      where: {
      categoryId: id,
      },
      select: { id: true }, // Only select the ID field for efficiency
    });
    
    const expensesWithCategory = expenseWithCategory ? 1 : 0;

    if (expensesWithCategory > 0) {
      throw new BadRequestException(
        `Cannot delete category as it's currently in use by ${expensesWithCategory} expense(s)`,
      );
    }

    const deletedCategory = await this.prisma.category.delete({
      where: { id },
    });

    return deletedCategory;
  }
}
