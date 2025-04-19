import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Data Transfer Object for app settings
 */
@Exclude()
export class UpdateAppSettingsDto {
  @ApiProperty({
    description: 'Preferred currency for the user',
    example: 'ETB',
  })
  @Expose()
  @IsOptional()
  @IsString()
  preferredCurrency?: string;

  @ApiProperty({
    description: 'Indicates whether amounts should be hidden',
    example: false,
  })
  @Expose()
  @IsOptional()
  @IsBoolean()
  hideAmounts?: boolean;

  @ApiProperty({
    description: 'Theme preference for the application',
    example: 'system',
  })
  @Expose()
  @IsOptional()
  @IsString()
  themePreference?: string;
  
  @ApiProperty({
    description: 'Google Gemini API key for AI-powered features',
    example: 'abc123xyz456',
  })
  @Expose()
  @IsOptional()
  @IsString()
  geminiApiKey?: string;
}
