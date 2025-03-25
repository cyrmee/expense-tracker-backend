import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsDto } from './dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';

@ApiTags('app-settings')
@Controller('app-settings')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get app settings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: "Returns the user's app settings",
    type: AppSettingsDto,
  })
  @ApiResponse({ status: 404, description: 'App settings not found' })
  async findOne(@Request() req) {
    const settings = await this.appSettingsService.findOneByUserId(req.user.id);
    if (!settings) {
      // Return default settings if none exist
      return this.appSettingsService.create(req.user.id, {});
    }
    return settings;
  }

  @Post()
  @ApiOperation({ summary: 'Create app settings for the authenticated user' })
  @ApiResponse({
    status: 201,
    description: 'App settings created successfully',
    type: AppSettingsDto,
  })
  async create(
    @Body() appSettingsDto: Partial<AppSettingsDto>,
    @Request() req,
  ) {
    return this.appSettingsService.create(req.user.id, appSettingsDto);
  }

  @Patch()
  @ApiOperation({ summary: 'Update app settings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'App settings updated successfully',
    type: AppSettingsDto,
  })
  async update(
    @Body() appSettingsDto: Partial<AppSettingsDto>,
    @Request() req,
  ) {
    return this.appSettingsService.update(req.user.id, appSettingsDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete app settings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'App settings deleted successfully',
    type: AppSettingsDto,
  })
  @ApiResponse({ status: 404, description: 'App settings not found' })
  async remove(@Request() req) {
    return this.appSettingsService.remove(req.user.id);
  }
}
