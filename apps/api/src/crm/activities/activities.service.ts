import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { buildOrderBy } from '../../common/utils/sort-order';
import { Activity } from '@saas/database';

const ACTIVITY_SORT_FIELDS = ['type', 'subject', 'dueDate', 'isCompleted', 'createdAt', 'updatedAt'] as const;

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  private async validateActivityRelations(
    dto: { contactId?: string; dealId?: string },
    tenantId: string
  ) {
    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: dto.contactId, tenantId },
      });
      if (!contact) {
        throw new NotFoundException(`Contact with ID ${dto.contactId} not found in this tenant`);
      }
    }

    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, tenantId },
      });
      if (!deal) {
        throw new NotFoundException(`Deal with ID ${dto.dealId} not found in this tenant`);
      }
    }
  }

  async create(dto: CreateActivityDto, tenantId: string): Promise<Activity> {
    await this.validateActivityRelations(dto, tenantId);

    return this.prisma.activity.create({
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        tenantId,
      },
    });
  }

  async findAll(query: PaginationQueryDto, tenantId: string, isCompleted?: boolean) {
    const { skip, limit, search, sortBy, sortOrder } = query;

    const where: any = {
      tenantId,
    };

    if (isCompleted !== undefined) {
      where.isCompleted = isCompleted;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.activity.count({ where }),
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
          deal: {
            select: { id: true, title: true },
          },
        },
        orderBy: buildOrderBy(sortBy, sortOrder, ACTIVITY_SORT_FIELDS),
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

  async findOne(id: string, tenantId: string): Promise<Activity> {
    const activity = await this.prisma.activity.findFirst({
      where: { id, tenantId },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        deal: {
          select: { id: true, title: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async update(id: string, dto: UpdateActivityDto, tenantId: string): Promise<Activity> {
    await this.findOne(id, tenantId);
    await this.validateActivityRelations(dto, tenantId);

    return this.prisma.activity.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async remove(id: string, tenantId: string): Promise<Activity> {
    await this.findOne(id, tenantId);

    return this.prisma.activity.delete({
      where: { id },
    });
  }
}
