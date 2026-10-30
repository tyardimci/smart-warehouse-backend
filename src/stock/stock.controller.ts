import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { CompanyRoles } from '../auth/decorators/company-roles.decorator';
import { CompanyRolesGuard } from '../auth/guards/company-roles.guard';
import { CompanyRole } from '@prisma/client';

import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { StockSummaryResponseDto } from './dto/stock-summary-response.dto';

function parseOptionalBool(v?: string): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  return undefined;
}

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@Controller('stock')
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  /**
   * ✅ Pilot için kritik: "Bu SKU nerelerde var?"
   * GET /v1/stock/balances?sku=...&includeZero=true|false
   */
  @Get('balances')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  @ApiOperation({
    summary: 'Item balances by SKU (location-level)',
    description:
      'Finds item by companyId+sku and returns StockBalance per location with location metadata (code, isReceiving, isDelivery).',
  })
  @ApiQuery({ name: 'sku', type: String, required: true, example: 'SKU-1-1770815739696' })
  @ApiQuery({
    name: 'includeZero',
    required: false,
    description: 'Include locations with qty=0 (true/false). Default=false.',
    type: String,
  })
  @ApiOkResponse({ description: 'Item + balances[]' })
  getBalancesBySku(
    @CompanyId() companyId: number,
    @Query('sku') sku: string,
    @Query('includeZero') includeZeroRaw?: string,
  ) {
    const includeZero = parseOptionalBool(includeZeroRaw) ?? false;
    return this.stockService.getBalancesBySku(companyId, sku, includeZero);
  }

  @Get('summary')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  @ApiOperation({
    summary: 'BIN-level stock summary',
    description:
      'Returns stock/reserved/available for a BIN. Also returns active threshold and minStockWarning if below threshold.',
  })
  @ApiQuery({ name: 'itemId', type: Number, required: true, example: 3 })
  @ApiQuery({
    name: 'locationId',
    type: Number,
    required: true,
    example: 11,
    description: 'BIN locationId',
  })
  @ApiOkResponse({ type: StockSummaryResponseDto })
  getSummary(
    @CompanyId() companyId: number,
    @Query('itemId', ParseIntPipe) itemId: number,
    @Query('locationId', ParseIntPipe) locationId: number,
  ) {
    return this.stockService.getSummary(companyId, itemId, locationId);
  }

  @Get('location/:locationId')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  @ApiOperation({
    summary: 'Aggregate stock for a location subtree',
    description: 'Aggregates StockBalance across all BIN children in subtree and groups by itemId.',
  })
  @ApiParam({ name: 'locationId', type: Number, example: 7 })
  @ApiQuery({
    name: 'includeZero',
    required: false,
    description: 'Include items with qty=0 (true/false). Default=false.',
    type: String,
  })
  @ApiOkResponse({ description: 'Array of { itemId, qty, item }' })
  getSubtreeStock(
    @CompanyId() companyId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
    @Query('includeZero') includeZeroRaw?: string,
  ) {
    const includeZero = parseOptionalBool(includeZeroRaw) ?? false;
    return this.stockService.getSubtreeStock(companyId, locationId, includeZero);
  }
}
