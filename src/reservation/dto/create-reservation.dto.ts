import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 3, description: 'Item ID' })
  @IsInt()
  @Min(1)
  itemId: number;

  @ApiProperty({ example: 11, description: 'BIN location ID' })
  @IsInt()
  @Min(1)
  locationId: number;

  @ApiProperty({ example: 5, description: 'Quantity to reserve (>=1)' })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiPropertyOptional({
    example: 'Ahmet Oto',
    description: 'Optional customer name (for sales / reservations)',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 'ORDER-123', description: 'Optional external reference' })
  @IsOptional()
  @IsString()
  reference?: string;
}
