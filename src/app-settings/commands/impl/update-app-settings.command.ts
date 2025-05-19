import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

@Exclude()
export class UpdateAppSettingsCommand {
  public userId: string;

  @ApiProperty({
    description: 'Preferred currency for the user',
    example: 'ETB',
  })
  @Expose()
  @IsOptional()
  @IsString()
  public preferredCurrency?: string;

  @ApiProperty({
    description: 'Indicates whether amounts should be hidden',
    example: false,
  })
  @Expose()
  @IsOptional()
  @IsBoolean()
  public hideAmounts?: boolean;

  @ApiProperty({
    description: 'Theme preference for the application',
    example: 'system',
  })
  @Expose()
  @IsOptional()
  @IsString()
  public themePreference?: string;

  @ApiProperty({
    description: 'Google Gemini API key for AI-powered features',
    example: 'abc123xyz456',
  })
  @Expose()
  @IsOptional()
  @IsString()
  public geminiApiKey?: string;

  @ApiProperty({
    description: 'Indicates whether the user has completed onboarding',
    example: true,
  })
  @Expose()
  @IsOptional()
  @IsBoolean()
  onboarded?: boolean;

  constructor(
    userId?: string,
    preferredCurrency?: string,
    hideAmounts?: boolean,
    themePreference?: string,
    geminiApiKey?: string,
    onboarded?: boolean,
  ) {
    if (userId) this.userId = userId;
    if (preferredCurrency !== undefined) this.preferredCurrency = preferredCurrency;
    if (hideAmounts !== undefined) this.hideAmounts = hideAmounts;
    if (themePreference !== undefined) this.themePreference = themePreference;
    if (geminiApiKey !== undefined) this.geminiApiKey = geminiApiKey;
    if (onboarded !== undefined) this.onboarded = onboarded;
  }
}