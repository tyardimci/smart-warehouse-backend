import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Standart
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Legacy support (curl/seed için)
        (req) => req?.headers?.['access-token'] ?? null,
      ]),
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
