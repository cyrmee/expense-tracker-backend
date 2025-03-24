import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { MoneySourcesService } from './money-sources.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { MoneySourceDto } from './dto';

@ApiTags('money-sources')
@ApiCookieAuth()
@Controller('money-sources')
export class MoneySourcesController {
  constructor(private readonly moneySourcesService: MoneySourcesService) {}

  @UseGuards(SessionAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all money sources for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all money sources for the user',
    type: [MoneySourceDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req) {
    return this.moneySourcesService.findAll(req.user.id);
  }

  @UseGuards(SessionAuthGuard)
  @Get(':id')
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
    return this.moneySourcesService.findOne(id, req.user.id);
  }

  @UseGuards(SessionAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new money source' })
  @ApiBody({ type: MoneySourceDto })
  @ApiResponse({
    status: 201,
    description: 'The money source has been successfully created',
    type: MoneySourceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createMoneySourceDto: any, @Request() req) {
    return this.moneySourcesService.create(createMoneySourceDto, req.user.id);
  }

  @UseGuards(SessionAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing money source' })
  @ApiParam({ name: 'id', description: 'Money source ID', example: 'cash' })
  @ApiBody({ type: MoneySourceDto })
  @ApiResponse({
    status: 200,
    description: 'The money source has been successfully updated',
    type: MoneySourceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Money source not found' })
  async update(
    @Param('id') id: string,
    @Body() updateMoneySourceDto: any,
    @Request() req,
  ) {
    return this.moneySourcesService.update(
      id,
      updateMoneySourceDto,
      req.user.id,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':id')
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
