import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderSequenceService } from './order-sequence.service';

@Module({
  imports: [PrismaModule],
  providers: [OrderSequenceService],
  exports: [OrderSequenceService],
})
export class OrderSequenceModule {}
