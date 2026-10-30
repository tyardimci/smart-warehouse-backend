import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CompanyRole } from '@prisma/client';

@Injectable()
export class CompanyUserService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------
  // List members of a company
  // ------------------------------
  list(companyId: number) {
    return this.prisma.companyUser.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            globalRole: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ------------------------------
  // Invite (create user if not exists + create membership)
  // Controller is calling: invite(companyId, email, password, role)
  // ------------------------------
  async invite(companyId: number, email: string, password: string, role: CompanyRole) {
    if (!email?.trim()) throw new BadRequestException('email is required');
    if (!password?.trim()) throw new BadRequestException('password is required');

    const normalizedEmail = email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hash,
        },
      });
    }

    // ✅ IMPORTANT: composite unique key name is companyId_userId
    const existing = await this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User already member of company');
    }

    const membership = await this.prisma.companyUser.create({
      data: {
        companyId,
        userId: user.id,
        role,
      },
      include: {
        user: { select: { id: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    });

    return membership;
  }

  // ------------------------------
  // Change role
  // ------------------------------
  async changeRole(companyId: number, userId: number, role: CompanyRole) {
    const membership = await this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not in this company');
    }

    return this.prisma.companyUser.update({
      where: { id: membership.id },
      data: { role },
    });
  }

  // ------------------------------
  // Helpers used elsewhere
  // ------------------------------
  async findMembership(companyId: number, userId: number) {
    return this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    });
  }

  async remove(companyId: number, userId: number) {
    const existing = await this.prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('CompanyUser not found');
    }

    return this.prisma.companyUser.delete({
      where: { id: existing.id },
    });
  }
}
