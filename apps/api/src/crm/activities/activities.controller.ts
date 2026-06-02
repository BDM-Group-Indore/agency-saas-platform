import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new activity (task/call/meeting)' })
  @ApiResponse({ status: 201, description: 'Activity successfully created' })
  create(@Body() dto: CreateActivityDto, @TenantId() tenantId: string) {
    return this.activitiesService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List activities with pagination, search, and completion filters' })
  @ApiQuery({ name: 'isCompleted', required: false, type: Boolean })
  findAll(
    @Query() query: PaginationQueryDto,
    @Query('isCompleted') isCompleted: string,
    @TenantId() tenantId: string
  ) {
    const isCompletedBool = isCompleted === 'true' ? true : isCompleted === 'false' ? false : undefined;
    return this.activitiesService.findAll(query, tenantId, isCompletedBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single activity' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.activitiesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update activity status or details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @TenantId() tenantId: string
  ) {
    return this.activitiesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an activity record' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.activitiesService.remove(id, tenantId);
  }
}
