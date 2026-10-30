import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ThresholdController } from './threshold.controller';
import { ThresholdService } from './threshold.service';

@Module({
  imports: [PrismaModule],
  controllers: [ThresholdController],
  providers: [ThresholdService],
  exports: [ThresholdService],
})
export class ThresholdModule {}
