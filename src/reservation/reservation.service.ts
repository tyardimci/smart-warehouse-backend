import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { ReservationStatus } from '@prisma/client';
import { LocationType, MovementType } from '@prisma/client';

@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

  // ===== helpers =====
  private async getStockSummaryTx(
    tx: any,
    companyId: number,
    itemId: number,
    locationId: number,
  ): Promise<{ stock: number; reserved: number; available: number }> {
    const [balance, reservedAgg] = await Promise.all([
      tx.stockBalance.findUnique({
        where: { companyId_itemId_locationId: { companyId, itemId, locationId } },
      }),
      tx.reservation.aggregate({
        where: {
          companyId,
          itemId,
          locationId,
          status: {
            in: [ReservationStatus.ACTIVE, ReservationStatus.PICKED, ReservationStatus.QA_OK],
          },
        },
        _sum: { qty: true },
      }),
    ]);

    const stock = balance?.qty ?? 0;
    const reserved = reservedAgg._sum.qty ?? 0;
    const available = stock - reserved;

    return { stock, reserved, available };
  }

  async list(companyId: number) {
    return this.prisma.reservation.findMany({
      where: { companyId },
      orderBy: { id: 'desc' },
    });
  }

  async create(
    companyId: number,
    dto: {
      itemId: number;
      locationId: number;
      qty: number;
      customerName?: string;
      reference?: string;
    },
  ) {
    const item = await this.prisma.item.findFirst({
      where: { companyId, id: dto.itemId },
    });
    if (!item) throw new NotFoundException('Item not found');

    const location = await this.prisma.location.findFirst({
      where: { companyId, id: dto.locationId, type: 'BIN' as any },
    });
    if (!location) throw new NotFoundException('BIN location not found');

    if (!dto.qty || dto.qty < 1) throw new BadRequestException('qty must be >= 1');

    return this.prisma.$transaction(async (tx) => {
      const { stock, reserved, available } = await this.getStockSummaryTx(
        tx,
        companyId,
        dto.itemId,
        dto.locationId,
      );

      // Prevent overbooking
      if (dto.qty > available) {
        throw new BadRequestException(
          `Insufficient stock. stock=${stock}, reserved=${reserved}, available=${available}`,
        );
      }

      const reservation = await tx.reservation.create({
        data: {
          companyId,
          itemId: dto.itemId,
          locationId: dto.locationId,
          qty: dto.qty,
          status: ReservationStatus.ACTIVE,
          customerName: dto.customerName ?? null,
          reference: dto.reference ?? null,
        },
      });

      const after = await this.getStockSummaryTx(tx, companyId, dto.itemId, dto.locationId);

      return {
        reservation,
        stock: after.stock,
        reserved: after.reserved,
        available: after.available,
      };
    });
  }

  async release(companyId: number, reservationId: number) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { companyId, id: reservationId },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException(`Reservation is not ACTIVE (status=${reservation.status})`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.RELEASED },
      });

      const after = await this.getStockSummaryTx(tx, companyId, updated.itemId, updated.locationId);

      return {
        reservation: updated,
        stock: after.stock,
        reserved: after.reserved,
        available: after.available,
      };
    });
  }

  async consume(companyId: number, id: number) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { companyId, id },
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      if (reservation.status === ReservationStatus.CONSUMED) {
        return { id, status: ReservationStatus.CONSUMED, idempotent: true };
      }

      if (reservation.status !== ReservationStatus.QA_OK) {
        throw new BadRequestException('Only QA_OK reservations can be consumed');
      }

      const deliveryBin = await tx.location.findFirst({
        where: { companyId, type: LocationType.BIN, isDelivery: true },
        orderBy: { id: 'asc' },
      });

      if (!deliveryBin) {
        throw new NotFoundException('Delivery BIN not found');
      }

      // Idempotency: aynı reservation için SALE_OUT var mı?
      const referenceNo = `RES-${reservation.id}`;
      const existingSale = await tx.movement.findFirst({
        where: {
          companyId,
          itemId: reservation.itemId,
          fromLocationId: deliveryBin.id,
          movementType: MovementType.SALE_OUT,
          referenceNo,
        },
        orderBy: { id: 'desc' },
      });

      if (existingSale) {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.CONSUMED },
        });

        return { id, status: ReservationStatus.CONSUMED, idempotent: true };
      }

      // Stock kontrol (StockBalance.qty)
      const stock = await tx.stockBalance.findUnique({
        where: {
          companyId_itemId_locationId: {
            companyId,
            itemId: reservation.itemId,
            locationId: deliveryBin.id,
          },
        },
      });

      if (!stock || stock.qty < reservation.qty) {
        throw new BadRequestException('Insufficient stock in DELIVERY BIN for consume');
      }

      // Stock düş
      await tx.stockBalance.update({
        where: {
          companyId_itemId_locationId: {
            companyId,
            itemId: reservation.itemId,
            locationId: deliveryBin.id,
          },
        },
        data: {
          qty: { decrement: reservation.qty },
        },
      });

      // Movement yaz
      await tx.movement.create({
        data: {
          companyId,
          itemId: reservation.itemId,
          qty: reservation.qty,
          movementType: MovementType.SALE_OUT,
          fromLocationId: deliveryBin.id,
          toLocationId: null,
          referenceNo,
        },
      });

      // Status update
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CONSUMED },
      });

      return { id, status: ReservationStatus.CONSUMED, idempotent: false };
    });
  }
  // =========================================================
  // QA - TEK TEK SKU okutma + sayaç (A: tek row + counter)
  // =========================================================

  async qaScan(companyId: number, reservationId: number, barcode: string) {
    if (!barcode || !barcode.trim()) throw new BadRequestException('barcode is required');

    const reservation = await this.prisma.reservation.findFirst({
      where: { companyId, id: reservationId },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (reservation.status !== ReservationStatus.PICKED) {
      throw new BadRequestException(`Reservation is not PICKED (status=${reservation.status})`);
    }

    const item = await this.prisma.item.findFirst({
      where: { companyId, id: reservation.itemId },
    });
    if (!item) throw new NotFoundException('Item not found');

    // barcode check: minimum "sku" contain (şimdilik)
    // İleride: companyPrefix + sku strict check
    if (!barcode.includes(item.sku)) {
      throw new BadRequestException('Scanned SKU does not match reservation item');
    }

    return this.prisma.$transaction(async (tx) => {
      // Ensure QA row exists (1 reservation = 1 row)
      await tx.reservationQa.upsert({
        where: { reservationId },
        create: {
          companyId,
          reservationId,
          scannedQty: 0,
          note: null,
        },
        update: {},
      });

      // Atomic increment with overscan protection
      const incRes = await tx.reservationQa.updateMany({
        where: {
          companyId,
          reservationId,
          scannedQty: { lt: reservation.qty },
        },
        data: {
          scannedQty: { increment: 1 },
        },
      });

      if (incRes.count !== 1) {
        throw new BadRequestException('QA already complete for this reservation');
      }

      const qa = await tx.reservationQa.findUnique({
        where: { reservationId },
        select: { scannedQty: true },
      });

      const scannedQty = qa?.scannedQty ?? 0;
      const remaining = Math.max(0, reservation.qty - scannedQty);
      const ready = scannedQty >= reservation.qty;

      if (ready) {
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.QA_OK },
        });
      }

      return {
        reservationId,
        itemId: reservation.itemId,
        expectedQty: reservation.qty,
        scannedQty,
        scannedCount: scannedQty, // backward-friendly
        remaining,
        readyForShip: ready,
        statusAfter: ready ? ReservationStatus.QA_OK : ReservationStatus.PICKED,
      };
    });
  }

  async qaReset(companyId: number, reservationId: number) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { companyId, id: reservationId },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (
      reservation.status !== ReservationStatus.PICKED &&
      reservation.status !== ReservationStatus.QA_OK
    ) {
      throw new BadRequestException(
        `Reservation is not PICKED/QA_OK (status=${reservation.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.reservationQa.upsert({
        where: { reservationId },
        create: {
          companyId,
          reservationId,
          scannedQty: 0,
          note: null,
        },
        update: {
          scannedQty: 0,
          note: null,
        },
      });

      // reset status back to PICKED (QA yeniden başlar)
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.PICKED },
      });

      return { ok: true };
    });
  }

  async qaStatus(companyId: number, reservationId: number) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { companyId, id: reservationId },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    const qa = await this.prisma.reservationQa.findUnique({
      where: { reservationId },
      select: { scannedQty: true },
    });

    const scannedQty = qa?.scannedQty ?? 0;
    const remaining = Math.max(0, reservation.qty - scannedQty);
    const ready = scannedQty >= reservation.qty;

    return {
      reservationId,
      itemId: reservation.itemId,
      expectedQty: reservation.qty,
      scannedQty,
      scannedCount: scannedQty, // backward-friendly
      remaining,
      readyForShip: ready,
      status: reservation.status,
    };
  }
}
