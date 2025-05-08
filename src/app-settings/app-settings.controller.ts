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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsDto, UpdateAppSettingsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { GetAppSettingsQuery } from './queries/impl';
import {
  CreateAppSettingsCommand,
  UpdateAppSettingsCommand,
  RemoveAppSettingsCommand,
} from './commands/impl';

@ApiTags('app-settings')
@Controller('app-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true }))
export class AppSettingsController {
  constructor(
    @Inject(forwardRef(() => AppSettingsService))
    private readonly appSettingsService: AppSettingsService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get app settings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: "Returns the user's app settings",
    type: AppSettingsDto,
  })
  @ApiResponse({ status: 404, description: 'App settings not found' })
  async getAppSettings(@Request() req) {
    const settings = await this.queryBus.execute(
      new GetAppSettingsQuery(req.user.id),
    );
    if (!settings) {
      // Return default settings if none exist
      await this.commandBus.execute(
        new CreateAppSettingsCommand(req.user.id),
      );
      return await this.queryBus.execute(
        new GetAppSettingsQuery(req.user.id),
      );
    }
    return settings;
  }

  @Patch()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update app settings for the authenticated user' })
  @ApiResponse({
    status: 204,
    description: 'App settings updated successfully',
  })
  @ApiBody({
    type: UpdateAppSettingsDto,
    description: 'Partial app settings to update',
  })
  async update(
    @Body()
    updateAppSettingsDto: UpdateAppSettingsDto,
    @Request() req,
  ) {
    // Extract properties from DTO and pass them to the command
    const {
      preferredCurrency,
      hideAmounts,
      themePreference,
      geminiApiKey,
    } = updateAppSettingsDto;

    await this.commandBus.execute(
      new UpdateAppSettingsCommand(
        req.user.id,
        preferredCurrency,
        hideAmounts,
        themePreference,
        geminiApiKey,
      ),
    );

    return {
      message: 'App settings updated successfully',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset app settings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'App settings reset successfully',
    type: AppSettingsDto,
  })
  @ApiResponse({ status: 404, description: 'App settings not found' })
  async remove(@Request() req) {
    await this.commandBus.execute(new RemoveAppSettingsCommand(req.user.id));
    await this.commandBus.execute(new CreateAppSettingsCommand(req.user.id));
    return {
      message: 'App settings reset successfully',
    };
  }
}
