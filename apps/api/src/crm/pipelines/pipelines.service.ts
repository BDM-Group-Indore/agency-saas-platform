import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  async seedDefaultPipeline(tenantId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.create({
        data: {
          name: 'Sales Pipeline',
          tenantId,
        },
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
        defaultStages.map((stage) =>
          tx.stage.create({
            data: {
              name: stage.name,
              order: stage.order,
              pipelineId: pipeline.id,
            },
          })
        )
      );

      return pipeline;
    });
  }

  async create(dto: CreatePipelineDto, tenantId: string) {
    return this.prisma.pipeline.create({
      data: {
        name: dto.name,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    let pipelines = await this.prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            deals: {
              include: {
                company: { select: { id: true, name: true } },
                contact: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (pipelines.length === 0) {
      await this.seedDefaultPipeline(tenantId);
      pipelines = await this.prisma.pipeline.findMany({
        where: { tenantId },
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              deals: {
                include: {
                  company: { select: { id: true, name: true } },
                  contact: { select: { id: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      });
    }

    return pipelines;
  }

  async findOne(id: string, tenantId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            deals: true,
          },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${id} not found`);
    }

    return pipeline;
  }

  async update(id: string, dto: UpdatePipelineDto, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.pipeline.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.pipeline.delete({
      where: { id },
    });
  }
}
