import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CategoryBaseDto, CategoryDto } from './dto';

@ApiTags('categories')
@Controller('categories')
@UseGuards(SessionAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Returns all categories',
    type: [CategoryDto],
  })
  async findAll(@Request() req) {
    return await this.categoriesService.getCategories(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  @ApiResponse({
    status: 200,
    description: 'Returns the category',
    type: CategoryDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const category = await this.categoriesService.getCategory(id, req.user.id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryDto,
  })
  async create(
    @Body()
    categoryDto: Omit<CategoryBaseDto, 'id' | 'createdAt' | 'updatedAt'>,
    @Request() req,
  ) {
    return await this.categoriesService.create({
      ...categoryDto,
      userId: req.user.id,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: CategoryDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(@Body() categoryDto: Partial<CategoryDto>, @Request() req) {
    categoryDto.userId = req.user.id; // Ensure the user ID is set for the update
    const updated = await this.categoriesService.update(
      categoryDto,
      req.user.id,
    );
    if (!updated) {
      throw new NotFoundException('Category not found or cannot be modified');
    }
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
    type: CategoryDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async remove(@Param('id') id: string, @Request() req) {
    const deleted = await this.categoriesService.remove(id, req.user.id);
    if (!deleted) {
      throw new NotFoundException('Category not found or cannot be deleted');
    }
    return deleted;
  }
}
