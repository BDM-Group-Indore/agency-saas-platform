import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'KPI summary: leads, deals, revenue, conversations' })
  getSummary(@TenantId() tenantId: string) {
    return this.analyticsService.getSummary(tenantId);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Lead-to-deal conversion funnel stages' })
  getFunnel(@TenantId() tenantId: string) {
    return this.analyticsService.getFunnel(tenantId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Monthly revenue trend for last 6 months' })
  getRevenueTrend(@TenantId() tenantId: string) {
    return this.analyticsService.getRevenueTrend(tenantId);
  }

  @Get('lead-sources')
  @ApiOperation({ summary: 'Lead count breakdown by source channel' })
  getLeadSources(@TenantId() tenantId: string) {
    return this.analyticsService.getLeadSources(tenantId);
  }
}
