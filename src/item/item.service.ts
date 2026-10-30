import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ItemService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: number, dto: CreateItemDto) {
    let finalSku = dto.sku?.trim();

    // Eğer SKU boş gelirse otomatik üret
    if (!finalSku || finalSku.length === 0) {
      finalSku = `SKU-${companyId}-${Date.now()}`;
    }

    try {
      return await this.prisma.item.create({
        data: {
          companyId,
          sku: finalSku,
          name: dto.name,
          description: dto.description,
          oemNo: dto.oemNo,
        },
      });
    } catch (error) {
      // Unique constraint (companyId + sku)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(`SKU '${finalSku}' already exists for this company`);
      }
      throw error;
    }
  }

  findAll(companyId: number) {
    return this.prisma.item.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(companyId: number, id: number) {
    return this.prisma.item.findFirst({
      where: { id, companyId },
    });
  }

  /**
   * ✅ 1B - Admin autocomplete/search
   * name/sku/oemNo üzerinden arar (max 20)
   */
  search(companyId: number, q: string, take = 20) {
    return this.prisma.item.findMany({
      where: {
        companyId,
        OR: [
          { sku: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { oemNo: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * ✅ 1A - Worker scan resolver
   * Öncelik:
   * 1) sku exact match
   * 2) oemNo exact match (varsa)
   */
  async resolveByValue(companyId: number, value: string) {
    const v = (value ?? '').trim();
    if (!v) throw new BadRequestException('value is required');

    const item =
      (await this.prisma.item.findFirst({ where: { companyId, sku: v } })) ||
      (await this.prisma.item.findFirst({ where: { companyId, oemNo: v } }));

    if (!item) {
      throw new NotFoundException(`Item not found for '${v}'`);
    }

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      oemNo: item.oemNo,
    };
  }

  async update(companyId: number, id: number, dto: UpdateItemDto) {
    return this.prisma.item.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: number, id: number) {
    return this.prisma.item.delete({
      where: { id },
    });
  }
}
