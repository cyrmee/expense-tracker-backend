import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  forwardRef,
  Inject,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsDto } from './dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';

@ApiTags('app-settings')
@Controller('app-settings')
@UseGuards(SessionAuthGuard)
@ApiCookieAuth()
@UsePipes(new ValidationPipe({ transform: true }))
export class AppSettingsController {
  constructor(
    @Inject(forwardRef(() => AppSettingsService))
    private readonly appSettingsService: AppSettingsService,
  ) {}

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
      return await this.appSettingsService.create(req.user.id, {});
    }
    return settings;
  }

  @Patch()
  @ApiOperation({ summary: 'Update app settings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'App settings updated successfully',
    type: AppSettingsDto,
  })
  @ApiBody({
    type: AppSettingsDto,
    description: 'Partial app settings to update',
  })
  async update(
    @Body() appSettingsDto: Partial<AppSettingsDto>,
    @Request() req,
  ) {
    return await this.appSettingsService.update(req.user.id, appSettingsDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Reset app settings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'App settings reset successfully',
    type: AppSettingsDto,
  })
  @ApiResponse({ status: 404, description: 'App settings not found' })
  async remove(@Request() req) {
    await this.appSettingsService.remove(req.user.id);
    return await this.appSettingsService.create(req.user.id, {});
  }
}
