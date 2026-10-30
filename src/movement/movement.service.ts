import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CounterpartyType, LocationType, MovementType, ReservationStatus } from '@prisma/client';
import { OrderSequenceService } from '../order-sequence/order-sequence.service';

@Injectable()
export class MovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seq: OrderSequenceService,
  ) {}

  private async resolveItemId(companyId: number, itemId?: number, sku?: string): Promise<number> {
    if (itemId) {
      const item = await this.prisma.item.findFirst({
        where: { companyId, id: itemId },
      });
      if (!item) throw new NotFoundException('Item not found');
      return item.id;
    }

    if (sku) {
      const item = await this.prisma.item.findFirst({
        where: { companyId, sku },
      });
      if (!item) throw new NotFoundException(`Item with sku '${sku}' not found`);
      return item.id;
    }

    throw new BadRequestException('itemId or sku is required');
  }

  private async getReceivingBin(companyId: number) {
    const receivingBin = await this.prisma.location.findFirst({
      where: { companyId, type: LocationType.BIN, isReceiving: true },
      orderBy: { id: 'asc' },
    });
    if (!receivingBin) throw new NotFoundException('Receiving BIN not found');
    return receivingBin;
  }

  private async getDeliveryBin(companyId: number) {
    const deliveryBin = await this.prisma.location.findFirst({
      where: { companyId, type: LocationType.BIN, isDelivery: true },
      orderBy: { id: 'asc' },
    });
    if (!deliveryBin) throw new NotFoundException('Delivery BIN not found');
    return deliveryBin;
  }

  /**
   * Genel movement yaratma (Inbound / Transfer vs)
   * - PURCHASE_IN: sadece toLocationId (BIN) gerekir, fromLocationId boş olmalı
   * - TRANSFER: fromLocationId + toLocationId (BIN) gerekir
   */
  async create(
    companyId: number,
    dto: {
      itemId?: number;
      sku?: string;
      qty: number;
      fromLocationId?: number | null;
      toLocationId?: number | null;
      movementType: MovementType;
      counterpartyType?: CounterpartyType | null;
      counterpartyName?: string | null;
      referenceNo?: string | null;
      note?: string | null;
    },
  ) {
    const {
      itemId,
      sku,
      qty,
      fromLocationId,
      toLocationId,
      movementType,
      counterpartyType,
      counterpartyName,
      referenceNo,
      note,
    } = dto;

    const finalReferenceNo = referenceNo ?? (await this.seq.nextRef(companyId, 'GEN'));

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('qty must be > 0');
    }

    const resolvedItemId = await this.resolveItemId(companyId, itemId, sku);

    const fromLoc = fromLocationId
      ? await this.prisma.location.findFirst({ where: { companyId, id: fromLocationId } })
      : null;
    const toLoc = toLocationId
      ? await this.prisma.location.findFirst({ where: { companyId, id: toLocationId } })
      : null;

    if (movementType === MovementType.PURCHASE_IN) {
      if (!toLocationId) throw new BadRequestException('toLocationId is required for PURCHASE_IN');
      if (fromLocationId)
        throw new BadRequestException('fromLocationId must be null for PURCHASE_IN');
      if (!toLoc || toLoc.type !== LocationType.BIN)
        throw new BadRequestException('toLocation must be BIN');
    }

    if (movementType === MovementType.TRANSFER) {
      if (!fromLocationId || !toLocationId) {
        throw new BadRequestException('fromLocationId and toLocationId are required for TRANSFER');
      }
      if (!fromLoc || fromLoc.type !== LocationType.BIN)
        throw new BadRequestException('fromLocation must be BIN');
      if (!toLoc || toLoc.type !== LocationType.BIN)
        throw new BadRequestException('toLocation must be BIN');
    }

    return this.prisma.$transaction(async (tx) => {
      // TRANSFER'da kaynaktan düş + hedefe ekle
      if (movementType === MovementType.TRANSFER) {
        const src = await tx.stockBalance.findUnique({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: resolvedItemId,
              locationId: fromLocationId!,
            },
          },
        });

        if ((src?.qty ?? 0) < qty) {
          throw new BadRequestException('Insufficient stock in source BIN');
        }

        await tx.stockBalance.update({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: resolvedItemId,
              locationId: fromLocationId!,
            },
          },
          data: { qty: { decrement: qty } },
        });

        await tx.stockBalance.upsert({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: resolvedItemId,
              locationId: toLocationId!,
            },
          },
          create: {
            companyId,
            itemId: resolvedItemId,
            locationId: toLocationId!,
            qty,
          },
          update: { qty: { increment: qty } },
        });
      }

      // PURCHASE_IN: sadece hedefe ekle (Receiving BIN’e)
      if (movementType === MovementType.PURCHASE_IN) {
        await tx.stockBalance.upsert({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: resolvedItemId,
              locationId: toLocationId!,
            },
          },
          create: {
            companyId,
            itemId: resolvedItemId,
            locationId: toLocationId!,
            qty,
          },
          update: { qty: { increment: qty } },
        });
      }

      const movement = await tx.movement.create({
        data: {
          companyId,
          itemId: resolvedItemId,
          qty,
          fromLocationId: fromLocationId ?? null,
          toLocationId: toLocationId ?? null,
          movementType,
          counterpartyType: counterpartyType ?? null,
          counterpartyName: counterpartyName ?? null,
          referenceNo: finalReferenceNo,
          note: note ?? null,
        },
      });

      return { movement };
    });
  }

  /**
   * Mobile-first inbound:
   * - PURCHASE_IN → company içindeki isReceiving=true BIN’e yazar
   * - client receivingBinId bilmek zorunda değil
   */
  async receivePurchase(companyId: number, dto: { itemId?: number; sku?: string; qty: number }) {
    const { itemId, sku, qty } = dto;

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('qty must be > 0');
    }

    const resolvedItemId = await this.resolveItemId(companyId, itemId, sku);
    const receivingBin = await this.getReceivingBin(companyId);

    return this.create(companyId, {
      itemId: resolvedItemId,
      qty,
      movementType: MovementType.PURCHASE_IN,
      fromLocationId: null,
      toLocationId: receivingBin.id,
      counterpartyType: CounterpartyType.SUPPLIER,
      referenceNo: await this.seq.nextRef(companyId, 'INB'),
      note: 'inbound receive (mobile)',
    });
  }

  /**
   * Mobile-first putaway:
   * - TRANSFER → company içindeki Receiving BIN’den hedef BIN’e taşır
   */
  async putawayFromReceiving(
    companyId: number,
    dto: { itemId?: number; sku?: string; qty: number; toLocationId: number },
  ) {
    const { itemId, sku, qty, toLocationId } = dto;

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('qty must be > 0');
    }

    const resolvedItemId = await this.resolveItemId(companyId, itemId, sku);
    const receivingBin = await this.getReceivingBin(companyId);

    if (toLocationId === receivingBin.id) {
      throw new BadRequestException('toLocationId cannot be the Receiving BIN');
    }

    return this.create(companyId, {
      itemId: resolvedItemId,
      qty,
      movementType: MovementType.TRANSFER,
      fromLocationId: receivingBin.id,
      toLocationId,
      referenceNo: await this.seq.nextRef(companyId, 'PUT'),
      note: 'putaway from receiving (mobile)',
    });
  }

  /**
   * Manual replenish:
   * - TRANSFER → bulk BIN'den delivery BIN'e taşır
   */
  async replenishFromBulk(
    companyId: number,
    dto: { itemId?: number; sku?: string; qty: number; fromLocationId: number },
  ) {
    const { itemId, sku, qty, fromLocationId } = dto;

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('qty must be > 0');
    }

    const resolvedItemId = await this.resolveItemId(companyId, itemId, sku);
    const deliveryBin = await this.getDeliveryBin(companyId);

    const fromLoc = await this.prisma.location.findFirst({
      where: { companyId, id: fromLocationId },
      select: { id: true, type: true, isReceiving: true, isDelivery: true },
    });

    if (!fromLoc || fromLoc.type !== LocationType.BIN) {
      throw new BadRequestException('fromLocation must be BIN');
    }

    if (fromLoc.isReceiving) {
      throw new BadRequestException('fromLocation cannot be Receiving BIN for replenish');
    }

    if (fromLoc.isDelivery) {
      throw new BadRequestException('fromLocation cannot be Delivery BIN for replenish');
    }

    return this.create(companyId, {
      itemId: resolvedItemId,
      qty,
      movementType: MovementType.TRANSFER,
      fromLocationId,
      toLocationId: deliveryBin.id,
      referenceNo: await this.seq.nextRef(companyId, 'RPL'),
      note: 'replenishment from bulk',
    });
  }

  /**
   * Auto replenish:
   * - Delivery BIN'deki aktif threshold'a göre eksik miktarı hesaplar
   * - Source olarak (Receiving/Delivery olmayan) BIN'ler arasından en çok stoğu olanı seçer
   */
  async autoReplenish(
    companyId: number,
    dto: { itemId?: number; sku?: string; deliveryLocationId?: number },
  ) {
    const { itemId, sku, deliveryLocationId } = dto;

    const resolvedItemId = await this.resolveItemId(companyId, itemId, sku);

    const deliveryBin = deliveryLocationId
      ? await this.prisma.location.findFirst({
          where: { companyId, id: deliveryLocationId, type: LocationType.BIN },
          select: { id: true, isDelivery: true, isReceiving: true },
        })
      : await this.getDeliveryBin(companyId);

    if (!deliveryBin) throw new NotFoundException('Delivery BIN not found');
    if (deliveryBin.isReceiving)
      throw new BadRequestException('deliveryLocationId cannot be a Receiving BIN');

    const threshold = await this.prisma.stockThreshold.findFirst({
      where: {
        companyId,
        itemId: resolvedItemId,
        locationId: deliveryBin.id,
        isActive: true,
      },
    });

    if (!threshold) {
      throw new NotFoundException('Active threshold not found for this item at delivery location');
    }

    const deliveryBalance = await this.prisma.stockBalance.findUnique({
      where: {
        companyId_itemId_locationId: {
          companyId,
          itemId: resolvedItemId,
          locationId: deliveryBin.id,
        },
      },
      select: { qty: true },
    });

    const deliveryStock = deliveryBalance?.qty ?? 0;
    const shortage = threshold.minQty - deliveryStock;

    if (shortage <= 0) {
      return {
        skipped: true,
        reason: 'Delivery stock meets threshold',
        itemId: resolvedItemId,
        deliveryLocationId: deliveryBin.id,
        minQty: threshold.minQty,
        stockBefore: deliveryStock,
        stockAfter: deliveryStock,
        shortage: 0,
        movedQty: 0,
        remainingShortage: 0,
        alertsAfter: false,
        partial: false,
      };
    }

    const candidates = await this.prisma.stockBalance.findMany({
      where: {
        companyId,
        itemId: resolvedItemId,
        qty: { gt: 0 },
        location: {
          type: LocationType.BIN,
          isReceiving: false,
          isDelivery: false,
        },
      },
      select: {
        locationId: true,
        qty: true,
      },
      orderBy: { qty: 'desc' },
      take: 20,
    });

    if (!candidates.length) {
      throw new BadRequestException('No source stock found in bulk bins');
    }

    const best = candidates[0];
    const moveQty = Math.min(shortage, best.qty);

    const result = await this.create(companyId, {
      itemId: resolvedItemId,
      qty: moveQty,
      movementType: MovementType.TRANSFER,
      fromLocationId: best.locationId,
      toLocationId: deliveryBin.id,
      referenceNo: await this.seq.nextRef(companyId, 'RPL'),
      note: 'auto replenishment (threshold)',
    });

    // ✅ stockAfter hesapla
    const deliveryAfter = await this.prisma.stockBalance.findUnique({
      where: {
        companyId_itemId_locationId: {
          companyId,
          itemId: resolvedItemId,
          locationId: deliveryBin.id,
        },
      },
      select: { qty: true },
    });

    const stockAfter = deliveryAfter?.qty ?? 0;
    const remainingShortage = Math.max(threshold.minQty - stockAfter, 0);

    // ✅ alertsAfter (bu item + delivery için hala alert var mı?)
    const alertsAfter = remainingShortage > 0;

    return {
      skipped: false,
      itemId: resolvedItemId,
      deliveryLocationId: deliveryBin.id,
      minQty: threshold.minQty,
      stockBefore: deliveryStock,
      stockAfter,
      shortage,
      movedQty: moveQty,
      remainingShortage,
      alertsAfter,
      fromLocationId: best.locationId,
      movement: result.movement,
      partial: moveQty < shortage,
    };
  }

  /**
   * Picking:
   * - Reservation’a bağlı pick işlemi
   * - receiving-first split: Receiving’de varsa önce oradan alır, kalanı bulk’tan taşır
   */
  async pick(
    companyId: number,
    dto: {
      reservationId: number;
      fromLocationId: number;
      qty: number;
    },
  ) {
    const { reservationId, fromLocationId, qty } = dto;

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('qty must be > 0');
    }

    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { companyId, id: reservationId },
      });
      if (!reservation) throw new NotFoundException('Reservation not found');

      if (reservation.status !== ReservationStatus.ACTIVE) {
        throw new BadRequestException('Reservation is not ACTIVE');
      }

      const fromLoc = await tx.location.findFirst({
        where: { companyId, id: fromLocationId },
      });
      if (!fromLoc || fromLoc.type !== LocationType.BIN) {
        throw new BadRequestException('fromLocation must be BIN');
      }

      const deliveryBin = await tx.location.findFirst({
        where: { companyId, isDelivery: true },
      });
      if (!deliveryBin) {
        throw new BadRequestException('Delivery BIN not found');
      }

      const pickedAgg = await tx.movement.aggregate({
        where: {
          companyId,
          movementType: MovementType.TRANSFER,
          referenceNo: `RES-${reservation.id}`,
          itemId: reservation.itemId,
        },
        _sum: { qty: true },
      });

      const alreadyPicked = pickedAgg._sum.qty ?? 0;

      if (alreadyPicked >= reservation.qty) {
        if (reservation.status === ReservationStatus.ACTIVE) {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: { status: ReservationStatus.PICKED },
          });
        }

        const lastMovement = await tx.movement.findFirst({
          where: { companyId, referenceNo: `RES-${reservation.id}` },
          orderBy: { createdAt: 'desc' },
        });

        return {
          movement: lastMovement,
          pickedTotal: alreadyPicked,
          reservationQty: reservation.qty,
          remaining: 0,
          readyForQa: true,
        };
      }

      const remainingToPick = reservation.qty - alreadyPicked;
      const reqPickQty = Math.min(qty, remainingToPick);

      const receivingBin = await tx.location.findFirst({
        where: { companyId, type: LocationType.BIN, isReceiving: true },
        select: { id: true },
      });

      let movedFromReceiving = 0;
      const movements: any[] = [];

      if (receivingBin) {
        const rcvBal = await tx.stockBalance.findUnique({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: reservation.itemId,
              locationId: receivingBin.id,
            },
          },
          select: { qty: true },
        });

        const rcvQty = rcvBal?.qty ?? 0;
        if (rcvQty > 0) {
          movedFromReceiving = Math.min(reqPickQty, rcvQty);

          const mv = await tx.movement.create({
            data: {
              companyId,
              movementType: MovementType.TRANSFER,
              itemId: reservation.itemId,
              qty: movedFromReceiving,
              fromLocationId: receivingBin.id,
              toLocationId: deliveryBin.id,
              counterpartyType: CounterpartyType.CUSTOMER,
              referenceNo: `RES-${reservation.id}`,
              note: 'picking (receiving-first)',
            },
          });

          await tx.stockBalance.update({
            where: {
              companyId_itemId_locationId: {
                companyId,
                itemId: reservation.itemId,
                locationId: receivingBin.id,
              },
            },
            data: { qty: { decrement: movedFromReceiving } },
          });

          await tx.stockBalance.upsert({
            where: {
              companyId_itemId_locationId: {
                companyId,
                itemId: reservation.itemId,
                locationId: deliveryBin.id,
              },
            },
            create: {
              companyId,
              itemId: reservation.itemId,
              locationId: deliveryBin.id,
              qty: movedFromReceiving,
            },
            update: { qty: { increment: movedFromReceiving } },
          });

          movements.push(mv);
        }
      }

      const remainingAfterReceiving = reqPickQty - movedFromReceiving;

      if (remainingAfterReceiving > 0) {
        const src = await tx.stockBalance.findUnique({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: reservation.itemId,
              locationId: fromLocationId,
            },
          },
          select: { qty: true },
        });

        if ((src?.qty ?? 0) < remainingAfterReceiving) {
          throw new BadRequestException('Insufficient stock in source BIN');
        }

        await tx.stockBalance.update({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: reservation.itemId,
              locationId: fromLocationId,
            },
          },
          data: { qty: { decrement: remainingAfterReceiving } },
        });

        await tx.stockBalance.upsert({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: reservation.itemId,
              locationId: deliveryBin.id,
            },
          },
          create: {
            companyId,
            itemId: reservation.itemId,
            locationId: deliveryBin.id,
            qty: remainingAfterReceiving,
          },
          update: { qty: { increment: remainingAfterReceiving } },
        });

        const mv = await tx.movement.create({
          data: {
            companyId,
            movementType: MovementType.TRANSFER,
            itemId: reservation.itemId,
            qty: remainingAfterReceiving,
            fromLocationId,
            toLocationId: deliveryBin.id,
            counterpartyType: CounterpartyType.CUSTOMER,
            referenceNo: `RES-${reservation.id}`,
            note: 'picking (bulk)',
          },
        });

        movements.push(mv);
      }

      const newPicked = alreadyPicked + reqPickQty;

      const statusAfter =
        newPicked >= reservation.qty ? ReservationStatus.PICKED : ReservationStatus.ACTIVE;

      if (statusAfter !== reservation.status) {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: statusAfter },
        });
      }

      return {
        movement: movements[movements.length - 1] ?? null,
        movements,
        pickedTotal: newPicked,
        reservationQty: reservation.qty,
        remaining: Math.max(reservation.qty - newPicked, 0),
        readyForQa: newPicked >= reservation.qty,
      };
    });
  }

  async list(
    companyId: number,
    query: {
      search?: string;
      movementType?: string;
      limit?: number;
    },
  ) {
    const { search, movementType } = query;
    const limit = Math.min(Number(query.limit ?? 50), 200);

    const where: any = {
      companyId,
    };

    if (movementType) {
      where.movementType = movementType;
    }

    if (search) {
      where.OR = [
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { item: { sku: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.movement.findMany({
      where,
      include: {
        item: { select: { id: true, sku: true, name: true } },
        fromLocation: {
          select: { id: true, code: true, name: true },
        },
        toLocation: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
