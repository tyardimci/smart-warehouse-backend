import { CompanyRole, GlobalRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class AssignRolesDto {
  /**
   * SUPER_ADMIN için gerekli (hedef company)
   * CUSTOMER_ADMIN için ignore edilir (token companyId kullanılır)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId?: number;

  /** Sadece SUPER_ADMIN set edebilir */
  @IsOptional()
  @IsEnum(GlobalRole)
  globalRole?: GlobalRole;

  /** SUPER_ADMIN veya (kendi şirketinde) CUSTOMER_ADMIN set edebilir */
  @IsOptional()
  @IsEnum(CompanyRole)
  companyRole?: CompanyRole;
}
