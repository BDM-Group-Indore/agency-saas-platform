import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company record' })
  @ApiResponse({ status: 201, description: 'Company successfully created' })
  create(@Body() dto: CreateCompanyDto, @TenantId() tenantId: string) {
    return this.companiesService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all companies with pagination and filters' })
  findAll(@Query() query: PaginationQueryDto, @TenantId() tenantId: string) {
    return this.companiesService.findAll(query, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single company by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.companiesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing company record' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @TenantId() tenantId: string
  ) {
    return this.companiesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company record' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.companiesService.remove(id, tenantId);
  }
}
