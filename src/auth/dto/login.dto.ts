import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongpass123' })
  @IsString()
  password: string;

  @ApiProperty({ example: 1, description: 'Company context' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId: number;
}
