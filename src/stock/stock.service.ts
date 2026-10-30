import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocationType, ReservationStatus } from '@prisma/client';

type AggRow = { itemId: number; qty: number };

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ✅ Pilot için kritik: SKU → location-level balances
   */
  async getBalancesBySku(companyId: number, sku: string, includeZero: boolean) {
    const s = (sku ?? '').trim();
    if (!s) throw new BadRequestException('sku is required');

    const item = await this.prisma.item.findFirst({
      where: { companyId, sku: s },
      select: { id: true, sku: true, name: true, description: true, oemNo: true },
    });

    if (!item) throw new NotFoundException(`Item with sku '${s}' not found`);

    const balances = await this.prisma.stockBalance.findMany({
      where: {
        companyId,
        itemId: item.id,
        ...(includeZero ? {} : { qty: { gt: 0 } }),
      },
      select: {
        locationId: true,
        qty: true,
        location: {
          select: {
            code: true,
            name: true,
            type: true,
            isReceiving: true,
            isDelivery: true,
            parentId: true,
          },
        },
      },
      orderBy: { locationId: 'asc' },
    });

    return {
      companyId,
      item,
      balances: balances.map((b) => ({
        locationId: b.locationId,
        qty: b.qty,
        location: b.location,
      })),
    };
  }

  // ✅ BIN bazlı: stock / reserved / available (+ threshold + warning)
  async getSummary(companyId: number, itemId: number, locationId: number) {
    const item = await this.prisma.item.findFirst({
      where: { companyId, id: itemId },
      select: { id: true, name: true, description: true },
    });
    if (!item) throw new NotFoundException('Item not found');

    const loc = await this.prisma.location.findFirst({
      where: { companyId, id: locationId },
      select: { id: true, code: true, name: true, type: true },
    });
    if (!loc) throw new NotFoundException('Location not found');
    if (loc.type !== LocationType.BIN) {
      throw new BadRequestException('Summary only allowed at BIN level');
    }

    const stockRow = await this.prisma.stockBalance.findUnique({
      where: {
        companyId_itemId_locationId: { companyId, itemId, locationId },
      },
      select: { qty: true },
    });
    const stock = stockRow?.qty ?? 0;

    const reservedAgg = await this.prisma.reservation.aggregate({
      where: { companyId, itemId, locationId, status: ReservationStatus.ACTIVE },
      _sum: { qty: true },
    });
    const reserved = reservedAgg._sum.qty ?? 0;

    const available = stock - reserved;

    const threshold = await this.prisma.stockThreshold.findFirst({
      where: { companyId, itemId, locationId, isActive: true },
      select: { id: true, minQty: true, isActive: true, note: true },
    });

    const minStockWarning =
      threshold && stock < threshold.minQty
        ? {
            thresholdId: threshold.id,
            minQty: threshold.minQty,
            stock,
            note: threshold.note ?? null,
          }
        : null;

    return {
      companyId,
      itemId,
      locationId,
      item,
      location: loc,
      stock,
      reserved,
      available,
      threshold: threshold
        ? { minQty: threshold.minQty, isActive: threshold.isActive, note: threshold.note ?? null }
        : null,
      minStockWarning,
    };
  }

  async getSubtreeStock(companyId: number, locationId: number, includeZero: boolean) {
    // root exists?
    const root = await this.prisma.location.findFirst({
      where: { id: locationId, companyId },
      select: { id: true },
    });
    if (!root) throw new NotFoundException('Location not found');

    // aggregate only BINs in subtree
    const agg = await this.prisma.$queryRaw<AggRow[]>`
      WITH RECURSIVE subtree AS (
        SELECT id
        FROM "Location"
        WHERE id = ${locationId} AND "companyId" = ${companyId}

        UNION ALL

        SELECT l.id
        FROM "Location" l
        INNER JOIN subtree s ON l."parentId" = s.id
        WHERE l."companyId" = ${companyId}
      )
      SELECT
        sb."itemId" as "itemId",
        COALESCE(SUM(sb."qty"), 0)::int as "qty"
      FROM "StockBalance" sb
      INNER JOIN subtree s ON s.id = sb."locationId"
      INNER JOIN "Location" loc ON loc.id = sb."locationId"
      WHERE sb."companyId" = ${companyId}
        AND loc."type" = ${LocationType.BIN}::"LocationType"
      GROUP BY sb."itemId"
    `;

    const map = new Map<number, number>();
    for (const r of agg) map.set(Number(r.itemId), Number(r.qty));

    if (!includeZero) {
      const ids = [...map.keys()];
      if (ids.length === 0) return [];

      const items = await this.prisma.item.findMany({
        where: { companyId, id: { in: ids } },
        select: { id: true, name: true, description: true },
        orderBy: { id: 'asc' },
      });

      return items.map((it) => ({
        itemId: it.id,
        qty: map.get(it.id) ?? 0,
        item: it,
      }));
    }

    // includeZero=true => all items
    const items = await this.prisma.item.findMany({
      where: { companyId },
      select: { id: true, name: true, description: true },
      orderBy: { id: 'asc' },
    });

    return items.map((it) => ({
      itemId: it.id,
      qty: map.get(it.id) ?? 0,
      item: it,
    }));
  }
}
