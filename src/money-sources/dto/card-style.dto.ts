import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

@Expose()
export class CardStyleDto {
  @ApiProperty({
    example: '12345',
    description: 'Unique identifier for the card style',
  })
  id: string;

  @ApiProperty({
    example: 'Modern Gradient',
    description: 'Name of the card style',
  })
  name: string;

  @ApiProperty({
    example: 'modern-gradient',
    description: 'Unique style identifier',
  })
  styleId: string;

  @ApiProperty({
    example: 'bg-gradient-to-br from-purple-600 via-pink-500 to-red-400',
    description: 'Background styling (Tailwind or custom)',
  })
  background: string;

  @ApiProperty({ example: 'text-white', description: 'Text color styling' })
  textColor: string;

  @ApiProperty({
    example: 'font-bold',
    description: 'Card number font styling',
  })
  cardNumberFont: string;

  @ApiProperty({ example: 'border-none', description: 'Border styling' })
  border: string;

  @ApiProperty({ example: 'shadow-xl', description: 'Shadow styling' })
  shadow: string;

  @ApiProperty({ example: true, description: 'Whether the card has a chip' })
  hasChip: boolean;

  @ApiProperty({ example: 'bg-white', description: 'Chip color styling' })
  chipColor: string;

  @ApiProperty({ example: 'white', description: 'Visa logo variant color' })
  visaLogoVariant: string;

  @ApiProperty({
    example: false,
    description: 'Whether to show background image',
  })
  showBgImage: boolean;
}
