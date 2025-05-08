import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

@Exclude()
export class CreateAppSettingsCommand {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  public userId: string;

  @ApiProperty({
    description: 'Preferred currency for the user',
    example: 'ETB',
  })
  @Expose()
  @IsNotEmpty()
  @IsString()
  public preferredCurrency: string = 'ETB';

  @ApiProperty({
    description: 'Indicates whether amounts should be hidden',
    example: false,
  })
  @Expose()
  @IsNotEmpty()
  @IsBoolean()
  public hideAmounts: boolean = true;

  @ApiProperty({
    description: 'Theme preference for the application',
    example: 'system',
  })
  @Expose()
  @IsNotEmpty()
  @IsString()
  public themePreference: string = 'system';

  constructor(
    userId?: string,
    preferredCurrency?: string,
    hideAmounts?: boolean,
    themePreference?: string,
  ) {
    if (userId) this.userId = userId;
    if (preferredCurrency) this.preferredCurrency = preferredCurrency;
    if (hideAmounts !== undefined) this.hideAmounts = hideAmounts;
    if (themePreference) this.themePreference = themePreference;
  }
}