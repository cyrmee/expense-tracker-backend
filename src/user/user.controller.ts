import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateUserDto, UserDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({ type: UpdateUserDto })
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 204,
    description: 'Returns message of successful update',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    await this.userService.updateProfile(req.user.id, updateUserDto);
    return {
      message: 'Profile updated successfully',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user profile' })
  @ApiResponse({
    status: 200,
    description: 'Successfully deleted user profile',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteProfile(@Request() req) {
    await this.userService.deleteUser(req.user.id);
    return {
      message: 'User profile deleted successfully',
    };
  }
}
