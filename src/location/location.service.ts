import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocationType } from '@prisma/client';

export type LocationNode = {
  id: number;
  code: string;
  name: string | null;
  type: LocationType;
  companyId: number;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  children: LocationNode[];
};

const ALLOWED_CHILDREN: Record<LocationType, LocationType[]> = {
  WAREHOUSE: ['ZONE'],
  ZONE: ['AISLE'],
  AISLE: ['RACK'],
  RACK: ['BIN'],
  BIN: [],
};

type CreateLocationInputDto = {
  code?: string; // ✅ autoCode için opsiyonel yaptık
  type: LocationType;
  name?: string;
  parentId?: number | null;
  autoCode?: boolean; // ✅ yeni
};

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: number) {
    return this.prisma.location.findMany({
      where: { companyId },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * ✅ 1B - Admin autocomplete/search
   * code/name üzerinden arar (max 20)
   */
  search(companyId: number, q: string, take = 20) {
    return this.prisma.location.findMany({
      where: {
        companyId,
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ code: 'asc' }],
      take,
    });
  }

  async findOne(companyId: number, id: number) {
    const loc = await this.prisma.location.findFirst({
      where: { companyId, id },
    });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  /**
   * ✅ 1A - Worker scan resolve: code veya id
   */
  async resolveByValue(companyId: number, value: string) {
    const v = (value ?? '').trim();
    if (!v) throw new BadRequestException('value required');

    const maybeId = Number(v);
    const loc = await this.prisma.location.findFirst({
      where: {
        companyId,
        OR: [{ code: v }, ...(Number.isFinite(maybeId) ? [{ id: maybeId }] : [])],
      },
    });

    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  /**
   * Company-wide Delivery BIN (tek)
   */
  async getDeliveryBin(companyId: number) {
    const delivery = await this.prisma.location.findFirst({
      where: { companyId, type: 'BIN', isDelivery: true },
      orderBy: { id: 'asc' },
    });
    if (!delivery) throw new NotFoundException('Delivery BIN not found');
    return delivery;
  }

  private async generateAutoCode(companyId: number, parentId: number, type?: LocationType) {
    const parent = await this.prisma.location.findFirst({
      where: { companyId, id: parentId },
      select: { code: true },
    });
    if (!parent) throw new NotFoundException('Parent location not found');

    const siblings = await this.prisma.location.findMany({
      where: { companyId, parentId },
      select: { code: true },
    });

    // BIN için: <parent>-B01, B02...
    const isBin = type === 'BIN';
    const prefix = isBin ? `${parent.code}-B` : `${parent.code}-`;

    let counter = 1;
    while (counter < 10000) {
      const suffix = String(counter).padStart(2, '0');
      const candidate = `${prefix}${suffix}`;
      const exists = siblings.some((s) => s.code === candidate);
      if (!exists) return candidate;
      counter++;
    }

    throw new BadRequestException('autoCode exhausted');
  }

  // --- create overloads (orijinal yapı korunuyor) ---
  async create(companyId: number, dto: CreateLocationInputDto): Promise<any>;
  async create(
    companyId: number,
    code: string,
    type: LocationType,
    name?: string,
    parentId?: number | null,
  ): Promise<any>;
  async create(
    companyId: number,
    arg1: CreateLocationInputDto | string,
    arg2?: LocationType,
    arg3?: string,
    arg4?: number | null,
  ) {
    // --- normalize args ---
    let code: string | undefined;
    let type: LocationType;
    let name: string | undefined;
    let parentId: number | null | undefined;
    let autoCode: boolean | undefined;

    if (typeof arg1 === 'string') {
      code = arg1;
      type = arg2 as LocationType;
      name = arg3;
      parentId = arg4;
      autoCode = undefined;
    } else {
      code = arg1.code;
      type = arg1.type;
      name = arg1.name;
      parentId = arg1.parentId;
      autoCode = arg1.autoCode;
    }

    const isRoot = parentId === undefined || parentId === null;

    // ✅ autoCode: sadece parent varsa devreye girsin
    if (!isRoot) {
      const wantsAuto = autoCode !== false; // default true gibi davran
      const trimmed = (code ?? '').trim();
      if (!trimmed && wantsAuto) {
        code = await this.generateAutoCode(companyId, parentId as number, type);
      } else {
        code = trimmed;
      }
    } else {
      // Root create’te code şart (tree code’lara bağlı)
      code = (code ?? '').trim();
      if (!code) throw new BadRequestException('code is required for root WAREHOUSE');
    }

    if (isRoot) {
      if (type !== 'WAREHOUSE') {
        throw new BadRequestException('Root location must be WAREHOUSE');
      }

      return this.prisma.$transaction(async (tx) => {
        const warehouse = await tx.location.create({
          data: { companyId, code: code!, type, name, parentId: null },
        });

        // PICK + BULK ZONE
        const pickZone = await tx.location.create({
          data: {
            companyId,
            code: `${code}-PICK`,
            type: 'ZONE',
            name: 'Ön Raf (PICK)',
            parentId: warehouse.id,
          },
        });

        const bulkZone = await tx.location.create({
          data: {
            companyId,
            code: `${code}-BULK`,
            type: 'ZONE',
            name: 'Ana Depo (BULK)',
            parentId: warehouse.id,
          },
        });

        // PICK: AISLE-01 -> RACK-01
        const pickAisle = await tx.location.create({
          data: {
            companyId,
            code: `${code}-PICK-A01`,
            type: 'AISLE',
            name: 'Koridor 01',
            parentId: pickZone.id,
          },
        });

        const pickRack = await tx.location.create({
          data: {
            companyId,
            code: `${code}-PICK-A01-R01`,
            type: 'RACK',
            name: 'Raf 01',
            parentId: pickAisle.id,
          },
        });

        // BULK: AISLE-01 -> RACK-01
        const bulkAisle = await tx.location.create({
          data: {
            companyId,
            code: `${code}-BULK-A01`,
            type: 'AISLE',
            name: 'Koridor 01',
            parentId: bulkZone.id,
          },
        });

        const bulkRack = await tx.location.create({
          data: {
            companyId,
            code: `${code}-BULK-A01-R01`,
            type: 'RACK',
            name: 'Raf 01',
            parentId: bulkAisle.id,
          },
        });

        // Receiving BIN – company başına tek
        const existingReceiving = await tx.location.findFirst({
          where: { companyId, type: 'BIN', isReceiving: true },
        });

        let receivingBin: any = null;
        if (!existingReceiving) {
          receivingBin = await tx.location.create({
            data: {
              companyId,
              code: `${code}-RCV-01`,
              type: 'BIN',
              name: 'GİRİŞ ALANI',
              parentId: bulkRack.id,
              isReceiving: true,
            },
          });
        }

        // Delivery BIN – company başına tek
        const existingDelivery = await tx.location.findFirst({
          where: { companyId, type: 'BIN', isDelivery: true },
        });

        let deliveryBin: any = null;
        if (!existingDelivery) {
          deliveryBin = await tx.location.create({
            data: {
              companyId,
              code: `${code}-DLV-01`,
              type: 'BIN',
              name: 'TESLİMAT ALANI',
              parentId: bulkRack.id,
              isDelivery: true,
            },
          });
        }

        return {
          warehouse,
          pick: { zone: pickZone, aisle: pickAisle, rack: pickRack },
          bulk: { zone: bulkZone, aisle: bulkAisle, rack: bulkRack, receivingBin, deliveryBin },
        };
      });
    }

    // Parent var
    const parent = await this.findOne(companyId, parentId as number);

    const allowed = ALLOWED_CHILDREN[parent.type] ?? [];
    if (!allowed.includes(type)) {
      throw new BadRequestException(
        `Invalid child type. Parent=${parent.type} allows [${allowed.join(', ')}], got=${type}`,
      );
    }

    // code unique check (daha anlamlı hata)
    const exists = await this.prisma.location.findFirst({
      where: { companyId, code: code! },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Location code already exists');

    return this.prisma.location.create({
      data: { companyId, code: code!, type, name, parentId: parentId as number },
    });
  }

  async update(
    companyId: number,
    id: number,
    dto: { code?: string; name?: string; parentId?: number | null },
  ) {
    await this.findOne(companyId, id);

    if (dto.code) {
      const exists = await this.prisma.location.findFirst({
        where: { companyId, code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (exists) throw new BadRequestException('Location code already exists');
    }

    return this.prisma.location.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        parentId: dto.parentId ?? undefined,
      },
    });
  }

  async remove(companyId: number, id: number) {
    await this.findOne(companyId, id);
    return this.prisma.location.delete({ where: { id } });
  }

  async getTree(companyId: number): Promise<LocationNode[]> {
    const rows = await this.prisma.location.findMany({
      where: { companyId },
      orderBy: [{ parentId: 'asc' }, { id: 'asc' }],
    });

    const map = new Map<number, LocationNode>();
    rows.forEach((r) => {
      map.set(r.id, { ...r, children: [] } as LocationNode);
    });

    const roots: LocationNode[] = [];
    rows.forEach((r) => {
      const node = map.get(r.id)!;
      if (r.parentId) {
        const parent = map.get(r.parentId);
        if (parent) parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getPath(companyId: number, id: number) {
    const loc = await this.findOne(companyId, id);

    const path: any[] = [];
    let cur: any = loc;

    while (cur) {
      path.unshift(cur);
      if (!cur.parentId) break;
      cur = await this.prisma.location.findFirst({
        where: { companyId, id: cur.parentId },
      });
    }

    return path;
  }
}
