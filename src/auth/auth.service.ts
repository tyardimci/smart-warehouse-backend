import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CompanyRole } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // =====================================================
  // REGISTER
  // =====================================================
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
      },
    });

    // Company membership (ilk kullanıcı = ADMIN)
    await this.prisma.companyUser.create({
      data: {
        companyId: dto.companyId,
        userId: user.id,
        role: CompanyRole.ADMIN,
      },
    });

    return { id: user.id, email: user.email };
  }

  // =====================================================
  // LOGIN
  // =====================================================
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId: dto.companyId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException('User not in this company');
    }

    // ✅ PAYLOAD STANDARD: role her zaman var
    const payload = {
      sub: user.id,
      companyId: dto.companyId,
      role: membership.role,
    };

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET environment variable is not set');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET environment variable is not set');

    const accessTtl = Number(process.env.JWT_ACCESS_TTL ?? 900); // seconds
    const refreshTtl = Number(process.env.JWT_REFRESH_TTL ?? 604800); // seconds

    const accessToken = this.jwt.sign(payload, {
      secret: accessSecret,
      expiresIn: accessTtl,
    });

    const refreshToken = this.jwt.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: refreshSecret,
        expiresIn: refreshTtl,
      },
    );
    // create session (REFRESH TOKEN == SESSION)
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        lastUsedAt: new Date(),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      access_expires_in: accessTtl,
      refresh_expires_in: refreshTtl,
    };
  }

  // =====================================================
  // REFRESH TOKEN
  // =====================================================
  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const accessSecret = process.env.JWT_ACCESS_SECRET;

    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET environment variable is not set');

    // verify refresh JWT with refresh secret
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessTtl = Number(process.env.JWT_ACCESS_TTL ?? 900);
    const refreshTtl = Number(process.env.JWT_REFRESH_TTL ?? 604800);

    const newPayload = {
      sub: payload.sub,
      companyId: payload.companyId,
      role: payload.role,
    };

    const newAccessToken = this.jwt.sign(newPayload, {
      secret: accessSecret,
      expiresIn: accessTtl,
    });

    const newRefreshToken = this.jwt.sign(
      { ...newPayload, jti: randomUUID() },
      {
        secret: refreshSecret,
        expiresIn: refreshTtl,
      },
    );

    // revoke old session + mark used
    // revoke old session + mark used (race-safe)
    const revoked = await this.prisma.session.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });

    if (revoked.count === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // create new session (rotated refresh token)
    await this.prisma.session.create({
      data: {
        userId: payload.sub,
        refreshToken: newRefreshToken,
        lastUsedAt: new Date(),
      },
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      access_expires_in: accessTtl,
      refresh_expires_in: refreshTtl,
    };
  }

  // =====================================================
  // LOGOUT (single token) - idempotent
  // =====================================================
  async logout(refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });

    return { success: true };
  }

  // =====================================================
  // LOGOUT ALL (user)
  // =====================================================
  async logoutAll(userId: number) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    return { success: true };
  }
}
