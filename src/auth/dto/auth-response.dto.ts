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
    description: 'Whether the user account is active',
    example: true,
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Whether the user account is verified',
    example: true,
  })
  isVerified?: boolean;
}
