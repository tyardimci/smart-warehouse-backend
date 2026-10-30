import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    PrismaModule,
    LocationModule, // ✅ GEREKLİ: LocationService burada inject ediliyor
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}
