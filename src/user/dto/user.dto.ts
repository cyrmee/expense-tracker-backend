import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Swagger DTO for user data
 */
@Exclude()
export class UserDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 'b6e11e23-d43d-4a0d-a9d3-08e94d7a032b',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'URL to user profile picture',
    example: 'https://example.com/images/profile.jpg',
  })
  @Expose()
  profilePicture: string;

  @ApiProperty({
    description: 'Whether the user has verified their account',
    example: true,
  })
  @Expose()
  isVerified: boolean;

  @ApiProperty({
    description: 'Date when the user account was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the user account was last updated',
    example: '2023-01-10T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether two-factor authentication is enabled',
    example: false,
  })
  @Expose()
  twoFactorEnabled: boolean;

  @ApiProperty({
    description: 'Number of posts created by the user',
    example: 10,
  })
  @Expose()
  postCount?: number;

  @ApiProperty({
    description: 'Number of followers of the user',
    example: 100,
  })
  @Expose()
  followerCount?: number;

  @ApiProperty({
    description: 'Number of users followed by the user',
    example: 50,
  })
  @Expose()
  followingCount?: number;
}
