import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { ThresholdService } from './threshold.service';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

@UseGuards(JwtAuthGuard)
@Controller('threshold')
export class ThresholdController {
  constructor(private readonly thresholdService: ThresholdService) {}

  @Get()
  list(@CompanyId() companyId: number, @Query('search') search?: string) {
    return this.thresholdService.list(companyId, search);
  }

  @Get('alerts')
  alerts(@CompanyId() companyId: number, @Query('scope') scope?: string) {
    return this.thresholdService.alerts(companyId, scope);
  }

  // create-or-update (upsert) — biz burada "tek aktif" kuralını enforce edeceğiz
  @Post()
  upsert(@CompanyId() companyId: number, @Body() dto: CreateThresholdDto) {
    return this.thresholdService.upsert(companyId, dto);
  }

  @Patch(':id')
  update(
    @CompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateThresholdDto,
  ) {
    return this.thresholdService.update(companyId, id, dto);
  }

  @Delete(':id')
  remove(@CompanyId() companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.thresholdService.remove(companyId, id);
  }
}
