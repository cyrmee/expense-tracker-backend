import {
  Controller,
  Get,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  Patch,
  Body,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { UserDto } from './dto';

@ApiTags('users')
@ApiCookieAuth()
@UseGuards(SessionAuthGuard)
@Controller('users')
@UsePipes(new ValidationPipe({ transform: true }))
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the profile of the current authenticated user',
    type: UserDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return await this.userService.getProfile(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated user profile',
    type: UserDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() data: Partial<UserDto>) {
    return await this.userService.updateProfile(req.user.id, data);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete user profile' })
  @ApiResponse({
    status: 200,
    description: 'Successfully deleted user profile',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteProfile(@Request() req) {
    return await this.userService.deleteUser(req.user.id);
  }
}
