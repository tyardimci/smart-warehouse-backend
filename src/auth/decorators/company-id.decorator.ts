import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CompanyId = createParamDecorator((_: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest();

  // 1) Header öncelikli (kanonik)
  const headerCompanyId = request.headers['x-company-id'] ?? request.headers['company-id'];
  if (headerCompanyId !== undefined && headerCompanyId !== null && headerCompanyId !== '') {
    const n = Number(headerCompanyId);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException('Geçersiz x-company-id');
    }
    return n;
  }

  // 2) Fallback: JWT içinden (legacy)
  const jwtCompanyId = request.user?.companyId;
  if (jwtCompanyId !== undefined && jwtCompanyId !== null) {
    const n = Number(jwtCompanyId);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException('Geçersiz companyId (jwt)');
    }
    return n;
  }

  // 3) Zorunlu
  throw new BadRequestException('x-company-id header zorunlu');
});
