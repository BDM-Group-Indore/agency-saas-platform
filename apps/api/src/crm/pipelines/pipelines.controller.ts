import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new custom sales pipeline' })
  @ApiResponse({ status: 201, description: 'Pipeline successfully created' })
  create(@Body() dto: CreatePipelineDto, @TenantId() tenantId: string) {
    return this.pipelinesService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all pipelines with their stages and nested deals' })
  findAll(@TenantId() tenantId: string) {
    return this.pipelinesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single pipeline with details' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.pipelinesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pipeline name' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePipelineDto,
    @TenantId() tenantId: string
  ) {
    return this.pipelinesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pipeline record' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.pipelinesService.remove(id, tenantId);
  }
}
