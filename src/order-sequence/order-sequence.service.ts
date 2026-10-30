import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  private yyyymmdd(d = new Date()) {
    return d.toISOString().slice(0, 10).replaceAll('-', '');
  }

  /**
   * company bazında tek sayaç (OrderSequence.last)
   * Örn: INB-20260219-0001
   */
  async nextRef(companyId: number, prefix: string, date = new Date()) {
    const row = await this.prisma.orderSequence.upsert({
      where: { companyId },
      create: { companyId, last: 1 },
      update: { last: { increment: 1 } },
    });

    const seq = String(row.last).padStart(4, '0');
    return `${prefix}-${this.yyyymmdd(date)}-${seq}`;
  }
}
