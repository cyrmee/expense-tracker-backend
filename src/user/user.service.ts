import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from './dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUsers(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({});

    return users.map((user) => ({
      ...user,
      profilePicture: user.profilePicture || '',
    }));
  }

  async getUserById(id: string): Promise<UserDto | null> {
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
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      ...user,
      profilePicture: user.profilePicture || '',
    };
  }

  async getProfile(userId: string) {
    if (!userId) {
      throw new Error('User ID is required for profile lookup');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // Transform user object to UserDto
    return plainToClass(UserDto, {
      ...user,
      profilePicture: user.profilePicture || '',
    });
  }

  async getAllUsers(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
      },
    });

    return users.map((user) => ({
      ...user,
      profilePicture: user.profilePicture || '',
    }));
  }
}
