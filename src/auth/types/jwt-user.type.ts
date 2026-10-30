import { CompanyRole, GlobalRole } from '@prisma/client';

export type JwtUser = {
  sub: number;
  companyId: number;
  globalRole: GlobalRole;
  companyRole: CompanyRole;
};
