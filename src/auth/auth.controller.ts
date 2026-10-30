import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---------------- REGISTER ----------------
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ---------------- LOGIN ----------------
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ---------------- REFRESH ----------------
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    if (!dto?.refresh_token) {
      throw new BadRequestException('refresh_token is required');
    }

    return this.authService.refresh(dto.refresh_token);
  }

  // ---------------- LOGOUT ----------------
  @Post('logout')
  logout(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refresh_token is required');
    }

    return this.authService.logout(refreshToken);
  }
}
