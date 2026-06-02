import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Deal } from '@saas/database';

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

  private async validateDealRelations(
    dto: { stageId?: string; companyId?: string; contactId?: string },
    tenantId: string
  ) {
    if (dto.stageId) {
      const stage = await this.prisma.stage.findFirst({
        where: {
          id: dto.stageId,
          pipeline: { tenantId },
        },
      });
      if (!stage) {
        throw new NotFoundException(`Stage with ID ${dto.stageId} not found in this tenant`);
      }
    }

    if (dto.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, tenantId },
      });
      if (!company) {
        throw new NotFoundException(`Company with ID ${dto.companyId} not found in this tenant`);
      }
    }

    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: dto.contactId, tenantId },
      });
      if (!contact) {
        throw new NotFoundException(`Contact with ID ${dto.contactId} not found in this tenant`);
      }
    }
  }

  async create(dto: CreateDealDto, tenantId: string): Promise<Deal> {
    await this.validateDealRelations(dto, tenantId);

    return this.prisma.deal.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async findAll(query: PaginationQueryDto, tenantId: string, filters?: { status?: string; stageId?: string }) {
    const { skip, limit, search, sortBy, sortOrder } = query;
    const status = filters?.status;
    const stageId = filters?.stageId;

    const where: any = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (stageId) {
      where.stageId = stageId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { firstName: { contains: search, mode: 'insensitive' } } },
        { contact: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        include: {
          stage: {
            select: { id: true, name: true, order: true },
          },
          company: {
            select: { id: true, name: true },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
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

  async findOne(id: string, tenantId: string): Promise<Deal> {
    const deal = await this.prisma.deal.findFirst({
      where: { id, tenantId },
      include: {
        stage: {
          select: { id: true, name: true, order: true },
        },
        company: {
          select: { id: true, name: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    return deal;
  }

  async update(id: string, dto: UpdateDealDto, tenantId: string): Promise<Deal> {
    await this.findOne(id, tenantId); // Validates existence & tenant ownership
    await this.validateDealRelations(dto, tenantId);

    return this.prisma.deal.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string): Promise<Deal> {
    await this.findOne(id, tenantId); // Validates existence & tenant ownership

    return this.prisma.deal.delete({
      where: { id },
    });
  }
}
