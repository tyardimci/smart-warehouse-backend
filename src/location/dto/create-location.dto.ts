// src/location/dto/create-location.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { LocationType } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  @Length(1, 50)
  code!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsEnum(LocationType)
  type!: LocationType;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;
}
