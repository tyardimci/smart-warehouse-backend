import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COMPANY_ROLES_KEY } from '../decorators/company-roles.decorator';
import { CompanyRole } from '@prisma/client';

@Injectable()
export class CompanyRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new ForbiddenException('Forbidden resource');

    // Global super admin bypass
    if (user.globalRole === 'SUPER_ADMIN') return true;

    // Endpoint'in istediği roller (varsa)
    const requiredRoles = this.reflector.getAllAndOverride<CompanyRole[]>(COMPANY_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // JwtStrategy normalize ediyor ama her ihtimale karşı fallback:
    const role: CompanyRole | null =
      (user.companyRole as CompanyRole) ?? (user.role as CompanyRole) ?? null;

    // @CompanyRoles yoksa -> membership yeter (companyId + role)
    if (!requiredRoles || requiredRoles.length === 0) {
      if (!user.companyId || !role) throw new ForbiddenException('Forbidden resource');
      return true;
    }

    // @CompanyRoles varsa -> role match zorunlu
    if (!role) throw new ForbiddenException('Forbidden resource');

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException('Forbidden resource');
    }

    return true;
  }
}
