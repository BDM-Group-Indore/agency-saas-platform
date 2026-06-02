import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Company } from '@saas/database';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyDto, tenantId: string): Promise<Company> {
    return this.prisma.company.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async findAll(query: PaginationQueryDto, tenantId: string) {
    const { skip, limit, search, sortBy, sortOrder } = query;

    const where: any = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string): Promise<Company> {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, tenantId: string): Promise<Company> {
    await this.findOne(id, tenantId); // Validates existence & tenant ownership

    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string): Promise<Company> {
    await this.findOne(id, tenantId); // Validates existence & tenant ownership

    return this.prisma.company.delete({
      where: { id },
    });
  }
}
