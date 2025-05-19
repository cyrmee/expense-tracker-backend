import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Data Transfer Object for app settings
 */
@Exclude()
export class AppSettingsDto {
  @ApiProperty({
    description: 'Unique app settings identifier',
    example: 'a1b2c3d4-e5f6-7g8h-9i10-jk11lm12no13',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Preferred currency for the user',
    example: 'ETB',
  })
  @Expose()
  preferredCurrency: string;

  @ApiProperty({
    description: 'Indicates whether amounts should be hidden',
    example: false,
  })
  @Expose()
  hideAmounts: boolean;

  @ApiProperty({
    description: 'Theme preference for the application',
    example: 'system',
  })
  @Expose()
  themePreference: string;

  @ApiProperty({
    description: 'Indicates whether the user has completed onboarding',
    example: true,
  })
  @Expose()
  onboarded: boolean;

  @ApiProperty({
    description: 'ID of the user who owns these settings',
    example: 'b6e11e23-d43d-4a0d-a9d3-08e94d7a032b',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'Date when the app settings were created',
    example: '2025-03-22T09:42:03.652Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the app settings were last updated',
    example: '2025-03-22T09:42:03.652Z',
  })
  @Expose()
  updatedAt: Date;
}
