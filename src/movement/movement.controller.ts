import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MovementService } from './movement.service';
import { CompanyId } from '../auth/decorators/company-id.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyRolesGuard } from '../auth/guards/company-roles.guard';
import { CompanyRoles } from '../auth/decorators/company-roles.decorator';

import { CompanyRole, CounterpartyType, MovementType } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
export class MovementController {
  constructor(private readonly service: MovementService) {}

  /**
   * POST /v1/movement
   * (Genel movement yaratma - admin/advanced)
   */
  @Post('movement')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  create(
    @CompanyId() companyId: number,
    @Body()
    body: {
      itemId?: number;
      sku?: string;
      qty: number;
      movementType: MovementType;
      fromLocationId?: number | null;
      toLocationId?: number | null;
      counterpartyType?: CounterpartyType | null;
      counterpartyName?: string | null;
      referenceNo?: string | null;
      note?: string | null;
    },
  ) {
    return this.service.create(companyId, body);
  }

  /**
   * POST /v1/picking
   * (reservation bazlı picking – mevcut davranış korunuyor)
   */
  @Post('picking')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  pick(
    @CompanyId() companyId: number,
    @Body()
    body: {
      reservationId: number;
      fromLocationId: number;
      qty: number;
    },
  ) {
    return this.service.pick(companyId, body);
  }

  /**
   * POST /v1/receive
   * (Inbound – PURCHASE_IN → Receiving BIN)
   * Mobile-friendly: itemId veya sku kabul eder
   */
  @Post('receive')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  receive(
    @CompanyId() companyId: number,
    @Body() body: { itemId?: number; sku?: string; qty: number },
  ) {
    return this.service.receivePurchase(companyId, body);
  }

  /**
   * POST /v1/putaway
   * (Putaway – Receiving BIN → hedef BIN)
   * Mobile-friendly: itemId veya sku kabul eder
   */
  @Post('putaway')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  putaway(
    @CompanyId() companyId: number,
    @Body() body: { itemId?: number; sku?: string; qty: number; toLocationId: number },
  ) {
    return this.service.putawayFromReceiving(companyId, body);
  }

  /**
   * POST /v1/replenish
   * (Replenish – Bulk BIN → Delivery BIN)
   * Mobile-friendly: itemId veya sku kabul eder
   */
  @Post('replenish')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  replenish(
    @CompanyId() companyId: number,
    @Body()
    body: { itemId?: number; sku?: string; qty: number; fromLocationId: number },
  ) {
    return this.service.replenishFromBulk(companyId, body);
  }

  /**
   * POST /v1/replenish/auto
   * (Threshold'a göre otomatik replenish)
   */
  @Post('replenish/auto')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  autoReplenish(
    @CompanyId() companyId: number,
    @Body()
    body: { itemId?: number; sku?: string; deliveryLocationId?: number },
  ) {
    return this.service.autoReplenish(companyId, body);
  }

  @Get('movement')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  list(
    @CompanyId() companyId: number,
    @Query('search') search?: string,
    @Query('movementType') movementType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(companyId, {
      search,
      movementType,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
