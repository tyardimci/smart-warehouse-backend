import { SetMetadata } from '@nestjs/common';

export const COMPANY_ROLES_KEY = 'company_roles';

export const CompanyRoles = (...roles: string[]) => SetMetadata(COMPANY_ROLES_KEY, roles);
