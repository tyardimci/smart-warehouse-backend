import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateThresholdDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minQty?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
