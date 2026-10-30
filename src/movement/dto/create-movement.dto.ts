import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CounterpartyType, MovementType } from '@prisma/client';

export class CreateMovementDto {
  // ✅ Backward compatible: itemId hâlâ kabul
  @IsOptional()
  @IsInt()
  itemId?: number;

  // ✅ Yeni: sku ile de item resolve edilebilir
  @IsOptional()
  @IsString()
  sku?: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsInt()
  fromLocationId?: number | null;

  @IsOptional()
  @IsInt()
  toLocationId?: number | null;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(MovementType)
  movementType?: MovementType;

  @IsOptional()
  @IsEnum(CounterpartyType)
  counterpartyType?: CounterpartyType;

  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;
}
