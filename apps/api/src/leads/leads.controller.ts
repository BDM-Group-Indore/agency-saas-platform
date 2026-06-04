import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { LeadStatus } from '@saas/shared-types';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Capture/Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead captured successfully' })
  create(@Body() dto: CreateLeadDto, @TenantId() tenantId: string) {
    return this.leadsService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List leads with filters, search, and pagination' })
  @ApiQuery({ name: 'status', required: false, enum: LeadStatus })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'assignedUserId', required: false, type: String })
  findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status: LeadStatus,
    @Query('source') source: string,
    @Query('assignedUserId') assignedUserId: string,
    @TenantId() tenantId: string
  ) {
    return this.leadsService.findAll(query, tenantId, { status, source, assignedUserId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single lead' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.leadsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead details (status, score, assignments)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @TenantId() tenantId: string
  ) {
    return this.leadsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead record' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.leadsService.remove(id, tenantId);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert qualified lead to a Contact, Company, and Deal' })
  convert(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.leadsService.convert(id, tenantId);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Manually assign/re-route a lead to an active user' })
  assign(
    @Param('id') id: string,
    @Body('assignedUserId') assignedUserId: string,
    @TenantId() tenantId: string
  ) {
    return this.leadsService.update(id, { assignedUserId }, tenantId);
  }
}
