import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ReservationService } from './reservation.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { CompanyRoles } from '../auth/decorators/company-roles.decorator';
import { CompanyRolesGuard } from '../auth/guards/company-roles.guard';
import { CompanyRole } from '@prisma/client';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { QaScanDto } from './dto/qa-scan.dto';

@Controller('reservation')
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  @Get()
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  list(@CompanyId() companyId: number) {
    return this.service.list(companyId);
  }

  @Post()
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  create(@CompanyId() companyId: number, @Body() dto: CreateReservationDto) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id/release')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  release(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.release(companyId, id);
  }

  @Patch(':id/consume')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  consume(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.consume(companyId, id);
  }

  @Post(':id/qa/scan')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  qaScan(
    @CompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: QaScanDto,
  ) {
    return this.service.qaScan(companyId, id, dto.barcode);
  }

  @Patch(':id/qa/reset')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  qaReset(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.qaReset(companyId, id);
  }

  @Get(':id/qa/status')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  qaStatus(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.qaStatus(companyId, id);
  }
}
