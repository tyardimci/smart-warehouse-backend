import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ThresholdService } from '../threshold/threshold.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly thresholdService: ThresholdService,
  ) {}

  async getDashboard(companyId: number) {
    // 1️⃣ Alerts
    const alerts = await this.thresholdService.alerts(companyId, 'all');

    // 2️⃣ Recent movements (son 10)
    const recentMovements = await this.prisma.movement.findMany({
      where: { companyId },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        fromLocation: { select: { id: true, code: true } },
        toLocation: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 3️⃣ Today counts
    // Turkey timezone (+03:00) "start of day"
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0 - 3, 0, 0, 0); // 00:00 TR == 21:00 UTC (prev day)

    const movementsToday = await this.prisma.movement.groupBy({
      by: ['movementType'],
      where: {
        companyId,
        createdAt: { gte: startOfDay },
      },
      _count: { movementType: true },
    });

    const todayCounts: Record<string, number> = {};
    for (const row of movementsToday) {
      todayCounts[row.movementType] = row._count.movementType;
    }

    return {
      companyId,
      alertsCount: alerts.length,
      alerts,
      recentMovements,
      todayCounts,
    };
  }
}
