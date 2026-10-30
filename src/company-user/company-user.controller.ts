import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';

import { CompanyUserService } from './company-user.service';
import { InviteCompanyUserDto } from './dto/invite-company-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyRolesGuard } from '../auth/guards/company-roles.guard';

import { CompanyRoles } from '../auth/decorators/company-roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';

import { CompanyRole } from '@prisma/client';

@Controller('company-user')
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
export class CompanyUserController {
  constructor(private readonly companyUserService: CompanyUserService) {}

  // ✅ CUSTOMER_ADMIN → kendi şirketine kullanıcı ekler
  @Post('invite')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  invite(
    @CompanyId() companyId: number,
    @Body()
    body: {
      email: string;
      password: string;
      role?: CompanyRole;
    },
  ) {
    return this.companyUserService.invite(
      companyId,
      body.email,
      body.password,
      body.role ?? CompanyRole.EMPLOYEE,
    );
  }

  // ✅ CUSTOMER_ADMIN → rol değiştirir
  @Put(':userId/role')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  changeRole(
    @CompanyId() companyId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { role: CompanyRole },
  ) {
    return this.companyUserService.changeRole(companyId, userId, body.role);
  }

  // ✅ COMPANY üyelerini listele
  // istersek EMPLOYEE'ye de açarız
  @Get()
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  list(@CompanyId() companyId: number) {
    return this.companyUserService.list(companyId);
  }
}
