import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized minimal DTO for returning user information from auth endpoints
 */
export class AuthUserResponseDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 'b6e11e23-d43d-4a0d-a9d3-08e94d7a032b',
  })
  id: string;

  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Whether two-factor authentication is enabled',
    example: false,
  })
  twoFactorEnabled: boolean;

  @ApiProperty({
    description:
      'Whether two-factor authentication is required for this session',
    example: true,
  })
  requires2FA: boolean;

  @ApiProperty({
    description:
      'Whether two-factor authentication has been verified for this session',
    example: false,
  })
  verified2FA?: boolean;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  isActive?: boolean;
}
