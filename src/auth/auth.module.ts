import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { JwtStrategy } from './strategies/jwt.strategy';
import { CompanyRolesGuard } from './guards/company-roles.guard';
import { GlobalRolesGuard } from './guards/global-roles.guard';

@Module({
  imports: [
    PrismaModule,

    // ✅ Passport default strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // ✅ JwtService access token için kullanılacak (biz signAsync'de secret veriyoruz ama module kalabilir)
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: Number(process.env.JWT_ACCESS_TTL) || 900,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, CompanyRolesGuard, GlobalRolesGuard],
  exports: [AuthService], // ileride başka modüller isterse
})
export class AuthModule {}
