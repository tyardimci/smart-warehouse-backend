import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateThresholdDto {
  @IsInt()
  @Min(1)
  itemId: number;

  @IsInt()
  @Min(1)
  locationId: number;

  @IsInt()
  @Min(0)
  minQty: number;

  @IsOptional()
  @IsString()
  note?: string;
}
