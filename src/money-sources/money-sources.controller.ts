import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { ApiPaginationQuery } from '../common/decorators';
import { PaginatedRequestDto, PaginatedResponseDto } from '../common/dto';
import {
  CardStyleDto,
  CreateMoneySourceDto,
  MoneySourceDto,
  UpdateMoneySourceDto,
} from './dto';
import { MoneySourcesService } from './money-sources.service';

@ApiTags('money-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('money-sources')
@UsePipes(new ValidationPipe({ transform: true }))
export class MoneySourcesController {
  constructor(private readonly moneySourcesService: MoneySourcesService) {}
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all money sources for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all money sources for the user',
    type: [MoneySourceDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiPaginationQuery()
  async getMoneySources(
    @Request() req,
    @Query() paginatedRequestDto: PaginatedRequestDto,
  ): Promise<PaginatedResponseDto<MoneySourceDto>> {
    return await this.moneySourcesService.getMoneySources(
      req.user.id,
      paginatedRequestDto,
    );
  }

  @Get('card-styles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all card styles' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all available card styles',
    type: [CardStyleDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCardStyles(): Promise<CardStyleDto[]> {
    return await this.moneySourcesService.getCardStyles();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific money source by ID' })
  @ApiParam({ name: 'id', description: 'Money source ID', example: 'cash' })
  @ApiResponse({
    status: 200,
    description: 'Returns the money source with the specified ID',
    type: MoneySourceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Money source not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return await this.moneySourcesService.getMoneySource(id, req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new money source' })
  @ApiBody({ type: CreateMoneySourceDto })
  @ApiResponse({
    status: 201,
    description: 'The money source has been successfully created',
    type: MoneySourceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createMoneySourceDto: CreateMoneySourceDto,
    @Request() req,
  ) {
    await this.moneySourcesService.create(createMoneySourceDto, req.user.id);
    return {
      message: 'Money source created successfully',
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update an existing money source' })
  @ApiParam({ name: 'id', description: 'Money source ID', example: 'cash' })
  @ApiBody({ type: UpdateMoneySourceDto })
  @ApiResponse({
    status: 200,
    description: 'The money source has been successfully updated',
    type: MoneySourceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Money source not found' })
  async update(
    @Param('id') id: string,
    @Body() updateMoneySourceDto: UpdateMoneySourceDto,
    @Request() req,
  ) {
    await this.moneySourcesService.update(
      id,
      updateMoneySourceDto,
      req.user.id,
    );
    return {
      message: 'Money source updated successfully',
    };
  }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a money source' })
  @ApiParam({ name: 'id', description: 'Money source ID', example: 'cash' })
  @ApiResponse({
    status: 200,
    description: 'The money source has been successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Money source not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.moneySourcesService.remove(id, req.user.id);
    return { message: 'Money source deleted successfully' };
  }
}
