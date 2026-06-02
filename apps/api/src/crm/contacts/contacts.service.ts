import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Contact } from '@saas/database';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  private async validateCompanyOwnership(companyId: string | undefined, tenantId: string) {
    if (!companyId) return;

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found in this tenant`);
    }
  }

  async create(dto: CreateContactDto, tenantId: string): Promise<Contact> {
    await this.validateCompanyOwnership(dto.companyId, tenantId);

    return this.prisma.contact.create({
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
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: {
            select: { id: true, name: true },
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

  async findOne(id: string, tenantId: string): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto, tenantId: string): Promise<Contact> {
    await this.findOne(id, tenantId); // Validates existence & tenant ownership
    await this.validateCompanyOwnership(dto.companyId, tenantId);

    return this.prisma.contact.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string): Promise<Contact> {
    await this.findOne(id, tenantId); // Validates existence & tenant ownership

    return this.prisma.contact.delete({
      where: { id },
    });
  }
}
