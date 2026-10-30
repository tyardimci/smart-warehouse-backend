// src/movement/movement.module.ts
import { Module } from '@nestjs/common';
import { MovementController } from './movement.controller';
import { MovementService } from './movement.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderSequenceModule } from '../order-sequence/order-sequence.module';

@Module({
  imports: [PrismaModule, OrderSequenceModule],
  controllers: [MovementController],
  providers: [MovementService],
})
export class MovementModule {}
