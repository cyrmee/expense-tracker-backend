import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category } from '@prisma/client';
import { CategoryBaseDto, CategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

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
    this.logger.log(`Creating category "${data.name}" for user ${data.userId}`);

    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon,
        user: {
          connect: { id: data.userId! },
        },
        isDefault: false, // User-created categories are never default
      },
    });

    this.logger.log(`Category created with ID: ${category.id}`);
    return category;
  }

  async update(data: Partial<CategoryBaseDto>, userId: string) {
    // Ensure users can only update their own categories
    if (!data.id) {
      this.logger.error('Category update failed - missing ID');
      throw new BadRequestException('Invalid data');
    }

    this.logger.log(`Updating category ${data.id} for user ${userId}`);

    const category = await this.getCategory(data.id, userId);
    if (!category) {
      this.logger.error(`Category ${data.id} not found for user ${userId}`);
      return null;
    }

    if (category.isDefault) {
      this.logger.warn(
        `Update failed - attempted to modify default category ${data.id}`,
      );
      return null;
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name,
        icon: data.icon,
        isDefault: data.isDefault,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Category ${data.id} updated successfully`);
    return updatedCategory;
  }

  async remove(id: string, userId: string) {
    this.logger.log(`Attempting to remove category ${id} for user ${userId}`);

    const category = await this.getCategory(id, userId);
    if (!category) {
      this.logger.error(`Category ${id} not found for user ${userId}`);
      return null;
    }

    if (category.isDefault) {
      this.logger.warn(
        `Deletion failed - attempted to remove default category ${id}`,
      );
      return null;
    }

    const deletedCategory = await this.prisma.category.delete({
      where: { id },
    });

    this.logger.log(`Category ${id} removed successfully`);
    return deletedCategory;
  }
}
