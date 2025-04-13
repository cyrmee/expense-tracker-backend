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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CategoryDto, CreateCategoryDto, UpdateCategoryDto } from './dto';

@ApiTags('categories')
@Controller('categories')
@UseGuards(SessionAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get category by id' })
  @ApiParam({ name: 'id', description: 'Category ID', type: 'string' })
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
  })
  @ApiBody({
    description: 'Category data',
    type: CreateCategoryDto,
  })
  async create(
    @Body() categoryDto: CreateCategoryDto,
    @Request() req,
  ) {
    await this.categoriesService.create(categoryDto, req.user.id);
    return { message: 'Category created successfully' };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID', type: 'string' })
  @ApiBody({
    description: 'Category update data',
    type: UpdateCategoryDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Category updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @Param('id') id: string,
    @Body() categoryDto: UpdateCategoryDto,
    @Request() req,
  ) {
    await this.categoriesService.update(id, categoryDto, req.user.id);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID', type: 'string' })
  @ApiResponse({
    status: 204,
    description: 'Category deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async remove(@Param('id') id: string, @Request() req) {
    const deleted = await this.categoriesService.remove(id, req.user.id);
    if (!deleted) {
      throw new NotFoundException('Category not found or cannot be deleted');
    }
    return;
  }
}
