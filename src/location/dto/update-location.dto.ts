// src/location/dto/update-location.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { LocationType } from '@prisma/client';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  // Tip değişimine izin veriyorsan açık bırak.
  // İstemiyorsan bu alanı tamamen kaldır.
  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null; // null -> parent'i kaldırmak için
}
