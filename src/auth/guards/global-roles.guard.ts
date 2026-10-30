import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class GlobalRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new ForbiddenException('Forbidden resource');

    // Only SUPER_ADMIN can access global endpoints
    if (user.globalRole === 'SUPER_ADMIN') return true;

    throw new ForbiddenException('Forbidden resource');
  }
}
