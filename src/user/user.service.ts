import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto, UserDto } from './dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUsers(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({});

    return users.map((user) => ({
      ...user,
      profilePicture: user.profilePicture || '',
    }));
  }

  async getUserById(id: string): Promise<UserDto | null> {
    this.logger.log(`Retrieving user by ID: ${id}`);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      this.logger.error(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      ...user,
      profilePicture: user.profilePicture || '',
    };
  }

  async getProfile(userId: string) {
    if (!userId) {
      this.logger.error('Profile retrieval failed - missing user ID');
      throw new Error('User ID is required for profile lookup');
    }

    this.logger.log(`Retrieving profile for user ${userId}`);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.error(
        `Profile retrieval failed - user with ID ${userId} not found`,
      );
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Transform user object to UserDto
    return plainToClass(UserDto, user);
  }

  async updateProfile(userId: string, data: UpdateUserDto) {
    if (!userId) {
      this.logger.error('Profile update failed - missing user ID');
      throw new Error('User ID is required for profile update');
    }

    this.logger.log(`Updating profile for user ${userId}`);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
      },
    });

    if (user?.email !== updatedUser?.email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: false,
        },
      });
    }

    this.logger.log(`Profile updated successfully for user ${userId}`);
    return;
  }

  async deleteUser(userId: string) {
    if (!userId) {
      this.logger.error('User deletion failed - missing user ID');
      throw new Error('User ID is required for deletion');
    }

    this.logger.log(`Deleting user account: ${userId}`);
    await this.prisma.user.delete({
      where: { id: userId },
    });

    this.logger.log(`User account ${userId} deleted successfully`);
    return;
  }
}
