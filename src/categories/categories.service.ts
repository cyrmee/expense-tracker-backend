import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category } from '@prisma/client';
import { CategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return await this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
      },
    });
  }

  async findOne(id: string, userId: string) {
    return await this.prisma.category.findFirst({
      where: {
        id,
        OR: [{ isDefault: true }, { userId }],
      },
    });
  }

  async create(data: Pick<Category, 'name' | 'icon' | 'userId'>) {
    return await this.prisma.category.create({
      data: {
        id: data.name.toLowerCase().replace(/\s+/g, '-'), // Generate ID from name
        ...data,
        isDefault: false, // User-created categories are never default
      },
    });
  }

  async update(id: string, userId: string, data: Partial<CategoryDto>) {
    // Ensure users can only update their own categories
    const category = await this.findOne(id, userId);
    if (!category || (category.isDefault && category.userId !== userId)) {
      return null;
    }

    return await this.prisma.category.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: string, userId: string) {
    // Ensure users can only delete their own categories
    const category = await this.findOne(id, userId);
    if (!category || category.isDefault) {
      return null;
    }

    return await this.prisma.category.delete({
      where: { id },
    });
  }
}
