import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ThresholdModule } from '../threshold/threshold.module';

@Module({
  imports: [PrismaModule, ThresholdModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
