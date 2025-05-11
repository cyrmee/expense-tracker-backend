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
    await this.prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        user: {
          connect: { id: userId },
        },
        isDefault: false, // User-created categories are never default
      },
    });
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

    const category = await this.getCategory(id, userId);
    if (!category)
      throw new NotFoundException(`Category with ID ${id} not found`);

    if (category.isDefault)
      throw new BadRequestException(
        `Default categories cannot be modified. Please create a new category instead.`,
      );

    await this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        updatedAt: new Date(),
      },
    });

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
    const expensesWithCategory = await this.prisma.expense.count({
      where: {
        categoryId: id,
      },
    });

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
