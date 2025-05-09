import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RemoveAppSettingsCommand {
  @ApiProperty({
    description: 'User ID whose settings will be removed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  public userId: string;

  constructor(userId?: string) {
    if (userId) this.userId = userId;
  }
}