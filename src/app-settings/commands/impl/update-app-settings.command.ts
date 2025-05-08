import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

@Exclude()
export class UpdateAppSettingsCommand {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  public readonly userId: string;

  @ApiProperty({
    description: 'Preferred currency for the user',
    example: 'ETB',
  })
  @Expose()
  @IsOptional()
  @IsString()
  public readonly preferredCurrency?: string;

  @ApiProperty({
    description: 'Indicates whether amounts should be hidden',
    example: false,
  })
  @Expose()
  @IsOptional()
  @IsBoolean()
  public readonly hideAmounts?: boolean;

  @ApiProperty({
    description: 'Theme preference for the application',
    example: 'system',
  })
  @Expose()
  @IsOptional()
  @IsString()
  public readonly themePreference?: string;
  
  @ApiProperty({
    description: 'Google Gemini API key for AI-powered features',
    example: 'abc123xyz456',
  })
  @Expose()
  @IsOptional()
  @IsString()
  public readonly geminiApiKey?: string;

  constructor(
    userId: string,
    preferredCurrency?: string,
    hideAmounts?: boolean,
    themePreference?: string,
    geminiApiKey?: string,
  ) {
    this.userId = userId;
    this.preferredCurrency = preferredCurrency;
    this.hideAmounts = hideAmounts;
    this.themePreference = themePreference;
    this.geminiApiKey = geminiApiKey;
  }
}