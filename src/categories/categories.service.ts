import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category } from '@prisma/client';
import { CategoryBaseDto, CategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(userId: string) {
    return await this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
      },
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

  async create(data: Omit<CategoryBaseDto, 'id' | 'createdAt' | 'updatedAt'>) {
    return await this.prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon,
        user: {
          connect: { id: data.userId! },
        },
        isDefault: false, // User-created categories are never default
      },
    });
  }

  async update(data: Partial<CategoryBaseDto>, userId: string) {
    // Ensure users can only update their own categories
    if (!data.id) throw new BadRequestException('Invalid data');

    const category = await this.getCategory(data.id, userId);
    if (!category || category.isDefault) {
      return null;
    }

    return await this.prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name,
        icon: data.icon,
        isDefault: data.isDefault,
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: string, userId: string) {
    const category = await this.getCategory(id, userId);
    if (!category || category.isDefault) {
      return null;
    }

    return await this.prisma.category.delete({
      where: { id },
    });
  }
}
