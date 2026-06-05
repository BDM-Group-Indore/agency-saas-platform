import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LeadStatus } from '@saas/shared-types';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private calculateScore(dto: { email?: string; phone?: string; companyName?: string; source?: string }): number {
    let score = 0;
    if (dto.email) {
      score += 10;
      const domain = dto.email.split('@')[1]?.toLowerCase();
      const freeProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'zoho.com', 'protonmail.com'];
      if (domain && !freeProviders.includes(domain)) {
        score += 30; // Corporate domain bonus
      }
    }
    if (dto.phone) {
      score += 20;
    }
    if (dto.companyName) {
      score += 20;
    }
    if (dto.source === 'WEB_FORM') {
      score += 10;
    }
    return score;
  }

  private async checkDuplicate(email?: string, phone?: string, tenantId?: string): Promise<boolean> {
    if (!tenantId) return false;
    if (!email && !phone) return false;

    const emailFilter = email ? { email } : null;
    const phoneFilter = phone ? { phone } : null;

    const OR: any[] = [];
    if (emailFilter) OR.push(emailFilter);
    if (phoneFilter) OR.push(phoneFilter);

    // 1. Search existing Contacts in this tenant
    const contactCount = await this.prisma.contact.count({
      where: {
        tenantId,
        OR,
      },
    });
    if (contactCount > 0) return true;

    // 2. Search existing Leads in this tenant (exclude converted ones)
    const leadCount = await this.prisma.lead.count({
      where: {
        tenantId,
        status: { not: LeadStatus.CONVERTED },
        OR,
      },
    });
    return leadCount > 0;
  }

  private async routeLead(tenantId: string): Promise<string | null> {
    // 1. Find active Sales or Managers in this tenant
    let targetUsers = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['SALES', 'MANAGER'] },
      },
      select: { id: true },
    });

    // 2. If none, fall back to active Agency Owners
    if (targetUsers.length === 0) {
      targetUsers = await this.prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          role: 'AGENCY_OWNER',
        },
        select: { id: true },
      });
    }

    if (targetUsers.length === 0) {
      return null;
    }

    // 3. Load-balance: assign to user with fewest active leads.
    // Single grouped aggregate — one DB round-trip regardless of team size.
    const userIds = targetUsers.map((u) => u.id);
    const groups = await this.prisma.lead.groupBy({
      by: ['assignedUserId'],
      where: {
        assignedUserId: { in: userIds },
        status: { not: LeadStatus.CONVERTED },
      },
      _count: { _all: true },
    });

    // Build a count map; users absent from the result have 0 active leads.
    const countMap = new Map<string, number>(
      groups.map((g) => [g.assignedUserId as string, g._count._all]),
    );

    // Pick the user with the lowest count (ties broken by original order).
    let minCount = Infinity;
    let assignedId: string | null = null;
    for (const { id } of targetUsers) {
      const count = countMap.get(id) ?? 0;
      if (count < minCount) {
        minCount = count;
        assignedId = id;
      }
    }
    return assignedId;
  }


  async create(dto: CreateLeadDto, tenantId: string) {
    const isDuplicate = await this.checkDuplicate(dto.email, dto.phone, tenantId);
    const score = this.calculateScore(dto);
    const assignedUserId = await this.routeLead(tenantId);

    return this.prisma.lead.create({
      data: {
        ...dto,
        tenantId,
        isDuplicate,
        score,
        assignedUserId,
      },
    });
  }

  async findAll(
    query: PaginationQueryDto,
    tenantId: string,
    filters?: { status?: LeadStatus; source?: string; assignedUserId?: string }
  ) {
    const { skip, limit, search, sortBy, sortOrder } = query;

    const where: any = {
      tenantId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.source) {
      where.source = filters.source;
    }
    if (filters?.assignedUserId) {
      where.assignedUserId = filters.assignedUserId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignedUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
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

  async findOne(id: string, tenantId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, tenantId: string) {
    const existing = await this.findOne(id, tenantId);

    // Recheck duplicate and recalculate score if email/phone changes
    let isDuplicate = existing.isDuplicate;
    let score = existing.score;

    if (dto.email !== undefined || dto.phone !== undefined) {
      const email = dto.email !== undefined ? dto.email : existing.email || undefined;
      const phone = dto.phone !== undefined ? dto.phone : existing.phone || undefined;
      isDuplicate = await this.checkDuplicate(email, phone, tenantId);
    }

    if (dto.email !== undefined || dto.phone !== undefined || dto.companyName !== undefined || dto.source !== undefined) {
      score = this.calculateScore({
        email: dto.email !== undefined ? dto.email : existing.email || undefined,
        phone: dto.phone !== undefined ? dto.phone : existing.phone || undefined,
        companyName: dto.companyName !== undefined ? dto.companyName : existing.companyName || undefined,
        source: dto.source !== undefined ? dto.source : existing.source || undefined,
      });
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        isDuplicate,
        score,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.lead.delete({
      where: { id },
    });
  }

  async convert(id: string, tenantId: string) {
    const lead = await this.findOne(id, tenantId);

    if (lead.status === LeadStatus.CONVERTED) {
      throw new ConflictException('Lead is already converted');
    }

    return this.prisma.$transaction(async (tx) => {
      let companyId: string | undefined;

      // 1. Create company if companyName exists
      if (lead.companyName) {
        const company = await tx.company.create({
          data: {
            name: lead.companyName,
            tenantId,
          },
        });
        companyId = company.id;
      }

      // 2. Create contact
      const contact = await tx.contact.create({
        data: {
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          companyId,
          tenantId,
        },
      });

      // 3. Find or seed a default Pipeline and get its first Stage
      let pipeline = await tx.pipeline.findFirst({
        where: { tenantId },
        include: { stages: { orderBy: { order: 'asc' } } },
      });

      if (!pipeline) {
        // Seed new default sales pipeline
        const newPipeline = await tx.pipeline.create({
          data: { name: 'Sales Pipeline', tenantId },
        });

        const defaultStages = [
          { name: 'Lead In', order: 1 },
          { name: 'Contact Made', order: 2 },
          { name: 'Demo Scheduled', order: 3 },
          { name: 'Proposal Sent', order: 4 },
          { name: 'Negotiations', order: 5 },
          { name: 'Closed Won', order: 6 },
          { name: 'Closed Lost', order: 7 },
        ];

        await Promise.all(
          defaultStages.map((s) =>
            tx.stage.create({
              data: { name: s.name, order: s.order, pipelineId: newPipeline.id },
            })
          )
        );

        pipeline = await tx.pipeline.findFirst({
          where: { id: newPipeline.id },
          include: { stages: { orderBy: { order: 'asc' } } },
        });
      }

      const firstStageId = pipeline?.stages[0]?.id;
      if (!firstStageId) {
        throw new NotFoundException('Default sales pipeline stage structure not found');
      }

      // 4. Create deal associated with contact and company
      const deal = await tx.deal.create({
        data: {
          title: `${lead.companyName || `${lead.firstName} ${lead.lastName || ''}`.trim()} Deal`,
          value: 0,
          status: 'OPEN',
          stageId: firstStageId,
          companyId,
          contactId: contact.id,
          tenantId,
        },
      });

      // 5. Update lead status to CONVERTED
      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          status: LeadStatus.CONVERTED,
        },
      });

      return {
        lead: updatedLead,
        contact,
        deal,
      };
    });
  }
}
