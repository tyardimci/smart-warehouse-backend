import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReservationDto {
  @ApiProperty() id: number;
  @ApiProperty() companyId: number;
  @ApiProperty() itemId: number;
  @ApiProperty() locationId: number;
  @ApiProperty() qty: number;
  @ApiProperty() status: string; // ACTIVE/RELEASED/CONSUMED/CANCELLED

  @ApiPropertyOptional({ nullable: true })
  customerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  reference?: string | null;

  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

class MinStockWarningDto {
  @ApiProperty() thresholdId: number;
  @ApiProperty() minQty: number;
  @ApiProperty() stock: number;
  @ApiPropertyOptional({ nullable: true }) note?: string | null;
}

export class ReservationActionResponseDto {
  @ApiProperty({ type: ReservationDto })
  reservation: ReservationDto;

  @ApiProperty() stock: number;
  @ApiProperty() reserved: number;
  @ApiProperty() available: number;

  @ApiPropertyOptional({ type: MinStockWarningDto, nullable: true })
  minStockWarning?: MinStockWarningDto | null;
}
