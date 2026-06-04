import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LogEventDto } from './dto/log-event.dto';

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

  @Get('api-metrics')
  @ApiOperation({ summary: 'Get API request latency and performance metrics' })
  getApiMetrics(@TenantId() tenantId: string) {
    return this.analyticsService.getApiPerformanceMetrics(tenantId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get security audit trails/logs for the tenant' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to retrieve' })
  getAuditLogs(
    @TenantId() tenantId: string,
    @Query('limit') limit?: number,
  ) {
    const resolvedLimit = limit && !isNaN(Number(limit)) ? Number(limit) : 100;
    return this.analyticsService.getAuditLogs(tenantId, resolvedLimit);
  }

  @Post('events')
  @ApiOperation({ summary: 'Manually record a custom security/audit event' })
  async logEvent(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: LogEventDto,
  ) {
    await this.analyticsService.logCustomEvent({
      tenantId,
      userId: user?.id || user?.userId,
      event: dto.event,
      status: dto.status,
      meta: dto.meta,
      ipAddress: dto.ipAddress,
      duration: dto.duration,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
    });
    return { success: true };
  }
}
