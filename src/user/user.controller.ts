import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(SessionAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the profile of the current authenticated user',
    type: UserDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  @UseGuards(SessionAuthGuard)
  @Get('list')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all users',
    type: [UserDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  async getAllUsers() {
    return this.userService.getAllUsers();
  }
}
