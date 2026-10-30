import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LocationService } from './location.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyRolesGuard } from '../auth/guards/company-roles.guard';
import { CompanyRoles } from '../auth/decorators/company-roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { CompanyRole, LocationType } from '@prisma/client';

@Controller('location')
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // READ: EMPLOYEE dahil (search opsiyonel)
  @Get()
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  findAll(@CompanyId() companyId: number, @Query('search') search?: string) {
    if (search && search.trim().length > 0) {
      return this.locationService.search(companyId, search.trim(), 20);
    }
    return this.locationService.findAll(companyId);
  }

  // READ: TREE
  @Get('tree')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  tree(@CompanyId() companyId: number) {
    return this.locationService.getTree(companyId);
  }

  // ✅ 1A - Worker scan resolve
  @Get('resolve')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  resolve(@CompanyId() companyId: number, @Query('value') value: string) {
    return this.locationService.resolveByValue(companyId, value);
  }

  // READ: PATH
  @Get(':id/path')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  path(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.locationService.getPath(companyId, id);
  }

  // READ: ONE
  @Get(':id')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  findOne(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.locationService.findOne(companyId, id);
  }

  // CREATE (✅ autoCode support eklendi; code opsiyonel)
  @Post()
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  create(
    @CompanyId() companyId: number,
    @Body()
    body: {
      code?: string;
      name?: string;
      type: LocationType;
      parentId?: number | null;
      autoCode?: boolean; // ✅ yeni
    },
  ) {
    return this.locationService.create(companyId, {
      code: body.code,
      type: body.type,
      name: body.name,
      parentId: body.parentId,
      autoCode: body.autoCode,
    } as any);
  }

  // UPDATE
  @Put(':id')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  update(
    @CompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      code?: string;
      name?: string;
      parentId?: number | null;
    },
  ) {
    return this.locationService.update(companyId, id, body);
  }

  // DELETE
  @Delete(':id')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  remove(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.locationService.remove(companyId, id);
  }
}
