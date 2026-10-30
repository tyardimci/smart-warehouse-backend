import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CompanyRole } from '@prisma/client';

export class InviteCompanyUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(CompanyRole)
  role?: CompanyRole;
}
