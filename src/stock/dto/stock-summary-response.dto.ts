import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class StockSummaryItemDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
}

class StockSummaryLocationDto {
  @ApiProperty() id: number;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() type: string; // BIN
}

class ThresholdInfoDto {
  @ApiProperty() minQty: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional({ nullable: true }) note?: string | null;
}

class MinStockWarningDto {
  @ApiProperty() thresholdId: number;
  @ApiProperty() minQty: number;
  @ApiProperty() stock: number;
  @ApiPropertyOptional({ nullable: true }) note?: string | null;
}

export class StockSummaryResponseDto {
  @ApiProperty() companyId: number;
  @ApiProperty() itemId: number;
  @ApiProperty() locationId: number;

  @ApiProperty({ type: StockSummaryItemDto })
  item: StockSummaryItemDto;

  @ApiProperty({ type: StockSummaryLocationDto })
  location: StockSummaryLocationDto;

  @ApiProperty() stock: number;
  @ApiProperty() reserved: number;
  @ApiProperty() available: number;

  @ApiPropertyOptional({ type: ThresholdInfoDto, nullable: true })
  threshold?: ThresholdInfoDto | null;

  @ApiPropertyOptional({ type: MinStockWarningDto, nullable: true })
  minStockWarning?: MinStockWarningDto | null;
}
