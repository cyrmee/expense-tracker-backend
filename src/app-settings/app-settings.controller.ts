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
import { JwtAuthGuard } from '../auth/guards';
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
    // Using query result as return type
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'App settings not found' })
  async getAppSettings(@Request() req) {
    const settings = await this.appSettingsService.getAppSettings(req.user.id);
    if (!settings) {
      // Return default settings if none exist
      const createCommand = new CreateAppSettingsCommand(req.user.id);
      await this.appSettingsService.create(createCommand);
      return await this.appSettingsService.getAppSettings(req.user.id);
    }
    return settings;
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update app settings for the authenticated user' })
  @ApiResponse({
    status: 204,
    description: 'App settings updated successfully',
  })
  @ApiBody({
    type: UpdateAppSettingsCommand,
    description: 'Partial app settings to update',
  })
  async update(
    @Body() command: UpdateAppSettingsCommand,
    @Request() req,
  ) {
    // Simply set the userId directly on the command object
    command.userId = req.user.id;

    await this.appSettingsService.update(command);

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
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'App settings not found' })
  async remove(@Request() req) {
    const removeCommand = new RemoveAppSettingsCommand();
    removeCommand.userId = req.user.id;
    await this.appSettingsService.remove(removeCommand);
    
    const createCommand = new CreateAppSettingsCommand();
    createCommand.userId = req.user.id;
    await this.appSettingsService.create(createCommand);
    
    return {
      message: 'App settings reset successfully',
    };
  }
}
