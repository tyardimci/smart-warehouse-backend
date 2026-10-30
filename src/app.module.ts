// src/app.module.ts
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { ItemModule } from './item/item.module';
import { MovementModule } from './movement/movement.module';
import { LocationModule } from './location/location.module';
import { StockModule } from './stock/stock.module';
import { ReservationModule } from './reservation/reservation.module';
import { ThresholdModule } from './threshold/threshold.module';
import { CompanyUserModule } from './company-user/company-user.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,

    // 🔐 Auth & Guards
    AuthModule,

    // 🏢 Company (SUPER_ADMIN)
    CompanyModule,

    // 📦 Items (Company-scoped)
    ItemModule,

    // 🔄 Movements (EMPLOYEE write / ADMIN manage)
    MovementModule,

    LocationModule,
    //Locations module

    StockModule,
    //Stock Module

    ReservationModule,

    ThresholdModule,

    CompanyUserModule,

    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
