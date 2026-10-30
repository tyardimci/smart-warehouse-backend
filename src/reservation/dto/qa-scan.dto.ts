import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class QaScanDto {
  @ApiProperty({ example: 'SKU-1-1770815739696' })
  @IsString()
  @MinLength(1)
  barcode: string;
}
