import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyRolesGuard } from '../auth/guards/company-roles.guard';
import { CompanyRoles } from '../auth/decorators/company-roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { CompanyRole } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  get(@CompanyId() companyId: number) {
    return this.service.getDashboard(companyId);
  }
}
