import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CounterpartyType, MovementType } from '@prisma/client';

export class UpdateMovementDto {
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
