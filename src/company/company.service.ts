import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  create(name: string) {
    return this.prisma.company.create({ data: { name } });
  }

  async update(id: number, name: string) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data: { name } });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.company.delete({ where: { id } });
    return { ok: true };
  }
}
