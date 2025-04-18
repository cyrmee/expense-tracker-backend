import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryDto as CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

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

    return deletedCategory;
  }
}
