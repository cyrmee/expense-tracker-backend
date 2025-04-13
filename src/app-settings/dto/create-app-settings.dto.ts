import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

/**
 * Data Transfer Object for app settings
 */
@Exclude()
export class CreateAppSettingsDto {
  @ApiProperty({
    description: 'Preferred currency for the user',
    example: 'ETB',
  })
  @Expose()
  @IsNotEmpty()
  @IsString()
  preferredCurrency: string;

  @ApiProperty({
    description: 'Indicates whether amounts should be hidden',
    example: false,
  })
  @Expose()
  @IsNotEmpty()
  @IsBoolean()
  hideAmounts: boolean = true;

  @ApiProperty({
    description: 'Theme preference for the application',
    example: 'system',
  })
  @Expose()
  @IsNotEmpty()
  @IsString()
  themePreference: string = 'system';
}
