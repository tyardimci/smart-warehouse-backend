import { Module } from '@nestjs/common';
import { CompanyUserController } from './company-user.controller';
import { CompanyUserService } from './company-user.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyUserController],
  providers: [CompanyUserService],
})
export class CompanyUserModule {}
