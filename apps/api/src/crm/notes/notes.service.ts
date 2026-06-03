import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { buildOrderBy } from '../../common/utils/sort-order';
import { Note } from '@saas/database';

const NOTE_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  private async validateNoteRelations(
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

  async create(dto: CreateNoteDto, tenantId: string): Promise<Note> {
    await this.validateNoteRelations(dto, tenantId);

    return this.prisma.note.create({
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
      where.content = { contains: search, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.note.count({ where }),
      this.prisma.note.findMany({
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
        orderBy: buildOrderBy(sortBy, sortOrder, NOTE_SORT_FIELDS),
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

  async findOne(id: string, tenantId: string): Promise<Note> {
    const note = await this.prisma.note.findFirst({
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

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return note;
  }

  async update(id: string, dto: UpdateNoteDto, tenantId: string): Promise<Note> {
    await this.findOne(id, tenantId);
    await this.validateNoteRelations(dto, tenantId);

    return this.prisma.note.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string): Promise<Note> {
    await this.findOne(id, tenantId);

    return this.prisma.note.delete({
      where: { id },
    });
  }
}
