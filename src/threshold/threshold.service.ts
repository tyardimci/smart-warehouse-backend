import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { LocationType } from '@prisma/client';

@Injectable()
export class ThresholdService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: number, search?: string) {
    const q = (search ?? '').trim();

    return this.prisma.stockThreshold.findMany({
      where: {
        companyId,
        ...(q
          ? {
              OR: [
                { item: { sku: { contains: q, mode: 'insensitive' } } },
                { item: { name: { contains: q, mode: 'insensitive' } } },
                { location: { code: { contains: q, mode: 'insensitive' } } },
                { location: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isReceiving: true,
            isDelivery: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * ✅ Gerçek upsert (@@unique([companyId,itemId,locationId]) ile uyumlu)
   * Aynı itemId+locationId gelirse CREATE yerine UPDATE yapar.
   */
  async upsert(companyId: number, dto: CreateThresholdDto) {
    const { itemId, locationId, minQty, note } = dto;

    if (!locationId) {
      // schema unique nullable ama pilotta location threshold'ı BIN bazlı istiyoruz
      throw new BadRequestException('locationId is required');
    }

    // item var mı
    const item = await this.prisma.item.findFirst({
      where: { companyId, id: itemId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Item not found');

    // location BIN mi
    const loc = await this.prisma.location.findFirst({
      where: { companyId, id: locationId },
      select: { id: true, type: true },
    });
    if (!loc) throw new NotFoundException('Location not found');
    if (loc.type !== LocationType.BIN) {
      throw new BadRequestException('Threshold only allowed at BIN level');
    }

    if (!Number.isInteger(minQty) || minQty < 0) {
      throw new BadRequestException('minQty must be >= 0');
    }

    // Prisma composite unique input adı:
    // companyId_itemId_locationId
    const threshold = await this.prisma.stockThreshold.upsert({
      where: {
        companyId_itemId_locationId: {
          companyId,
          itemId,
          locationId,
        },
      },
      create: {
        companyId,
        itemId,
        locationId,
        minQty,
        note: note ?? null,
        isActive: true,
      },
      update: {
        minQty,
        note: note ?? null,
        isActive: true,
      },
    });

    // include’lu döndür (panel için)
    return this.prisma.stockThreshold.findFirst({
      where: { id: threshold.id, companyId },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isReceiving: true,
            isDelivery: true,
          },
        },
      },
    });
  }

  async update(companyId: number, id: number, dto: UpdateThresholdDto) {
    const current = await this.prisma.stockThreshold.findFirst({
      where: { companyId, id },
    });
    if (!current) throw new NotFoundException('Threshold not found');

    if (dto.minQty !== undefined) {
      if (!Number.isInteger(dto.minQty) || dto.minQty < 0) {
        throw new BadRequestException('minQty must be >= 0');
      }
    }

    const updated = await this.prisma.stockThreshold.update({
      where: { id: current.id },
      data: {
        minQty: dto.minQty ?? undefined,
        note: dto.note ?? undefined,
        isActive: typeof dto.isActive === 'boolean' ? dto.isActive : undefined,
      },
    });

    return this.prisma.stockThreshold.findFirst({
      where: { id: updated.id, companyId },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isReceiving: true,
            isDelivery: true,
          },
        },
      },
    });
  }

  async remove(companyId: number, id: number) {
    const threshold = await this.prisma.stockThreshold.findFirst({
      where: { companyId, id },
    });
    if (!threshold) throw new NotFoundException('Threshold not found');

    return this.prisma.stockThreshold.delete({ where: { id } });
  }

  async alerts(companyId: number, scope?: string) {
    const onlyDelivery = scope !== 'all'; // default: delivery

    type AlertRow = {
      item: { id: number; sku: string; name: string };
      location: { id: number; code: string; name: string | null };
      minQty: number;
      stock: number;
      shortage: number;
    };

    const thresholds = await this.prisma.stockThreshold.findMany({
      where: {
        companyId,
        isActive: true,
        // ✅ locationId null olanları pilotta yok sayıyoruz
        locationId: { not: null },
      },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            isDelivery: true,
            isReceiving: true,
          },
        },
      },
    });

    const alerts: AlertRow[] = [];

    for (const t of thresholds) {
      // Prisma type nullable dediği için runtime guard (garanti)
      if (!t.locationId || !t.location) continue;

      if (onlyDelivery && !t.location.isDelivery) continue;

      const balance = await this.prisma.stockBalance.findUnique({
        where: {
          companyId_itemId_locationId: {
            companyId,
            itemId: t.itemId,
            locationId: t.locationId,
          },
        },
        select: { qty: true },
      });

      const stock = balance?.qty ?? 0;

      if (stock < t.minQty) {
        alerts.push({
          item: t.item,
          location: {
            id: t.location.id,
            code: t.location.code,
            name: t.location.name,
          },
          minQty: t.minQty,
          stock,
          shortage: t.minQty - stock,
        });
      }
    }

    return alerts;
  }
}
