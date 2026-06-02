import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deal record' })
  @ApiResponse({ status: 201, description: 'Deal successfully created' })
  create(@Body() dto: CreateDealDto, @TenantId() tenantId: string) {
    return this.dealsService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List deals with pagination, search, and status/stage filters' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'WON', 'LOST'] })
  @ApiQuery({ name: 'stageId', required: false, type: String })
  findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status: string,
    @Query('stageId') stageId: string,
    @TenantId() tenantId: string
  ) {
    return this.dealsService.findAll(query, tenantId, { status, stageId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single deal details' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.dealsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a deal record (move stages, change status, update value)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
    @TenantId() tenantId: string
  ) {
    return this.dealsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deal record' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.dealsService.remove(id, tenantId);
  }
}
