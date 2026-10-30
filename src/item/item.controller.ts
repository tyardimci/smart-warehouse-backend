import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ItemService } from './item.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyRolesGuard } from '../auth/guards/company-roles.guard';
import { CompanyRoles } from '../auth/decorators/company-roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';

import { CompanyRole } from '@prisma/client';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('item')
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  // ✅ READ – EMPLOYEE dahil (search opsiyonel)
  @Get()
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  findAll(@CompanyId() companyId: number, @Query('search') search?: string) {
    if (search && search.trim().length > 0) {
      return this.itemService.search(companyId, search.trim(), 20);
    }
    return this.itemService.findAll(companyId);
  }

  /**
   * ✅ 1A - Worker scan resolver
   * POST /v1/item/resolve
   * body: { value: "SKU-..." }
   */
  @Post('resolve')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  resolve(@CompanyId() companyId: number, @Body() body: { value: string }) {
    return this.itemService.resolveByValue(companyId, body.value);
  }

  // ✅ READ – EMPLOYEE dahil
  @Get(':id')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN, CompanyRole.EMPLOYEE)
  findOne(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.itemService.findOne(companyId, id);
  }

  // ❗ WRITE – sadece CUSTOMER_ADMIN (+ SUPER_ADMIN)
  @Post()
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  create(@CompanyId() companyId: number, @Body() dto: CreateItemDto) {
    return this.itemService.create(companyId, dto);
  }

  // ❗ WRITE – sadece CUSTOMER_ADMIN (+ SUPER_ADMIN)
  @Put(':id')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  update(
    @CompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemService.update(companyId, id, dto);
  }

  // ❗ WRITE – sadece CUSTOMER_ADMIN (+ SUPER_ADMIN)
  @Delete(':id')
  @CompanyRoles(CompanyRole.CUSTOMER_ADMIN)
  remove(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.itemService.remove(companyId, id);
  }
}
