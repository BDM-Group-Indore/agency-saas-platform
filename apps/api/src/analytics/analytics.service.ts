import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventStoreService } from './event-store.service';
import { AuditEventPayload, ApiMetricsSummary } from '@saas/shared-types';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventStoreService,
  ) {}

  // ─── KPI Summary ─────────────────────────────────────────────────────────
  async getSummary(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalLeads,
      leadsThisMonth,
      leadsLastMonth,
      totalDeals,
      wonDeals,
      openConversations,
      totalCampaigns,
      paidInvoices,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.lead.count({
        where: { tenantId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      this.prisma.deal.count({ where: { tenantId } }),
      this.prisma.deal.findMany({ where: { tenantId, status: 'WON' }, select: { value: true } }),
      this.prisma.whatsAppConversation.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.whatsAppBroadcast.count({ where: { tenantId } }),
      this.prisma.invoice.findMany({ where: { tenantId, status: 'PAID' }, select: { amount: true } }),
    ]);

    const totalDealsValue = await this.prisma.deal
      .findMany({ where: { tenantId }, select: { value: true } })
      .then((d) => d.reduce((s, x) => s + (x.value ?? 0), 0));

    const wonDealsValue = wonDeals.reduce((s, x) => s + (x.value ?? 0), 0);
    const totalRevenue = paidInvoices.reduce((s, x) => s + x.amount, 0);

    const conversionRate =
      totalLeads > 0 ? Math.round((wonDeals.length / totalLeads) * 100 * 10) / 10 : 0;

    const leadsGrowthPct =
      leadsLastMonth > 0
        ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 * 10) / 10
        : 0;

    return {
      totalLeads,
      leadsThisMonth,
      leadsGrowthPct,
      totalDeals,
      totalDealsValue,
      wonDealsValue,
      conversionRate,
      openConversations,
      totalCampaigns,
      totalRevenue,
    };
  }

  // ─── Conversion Funnel ────────────────────────────────────────────────────
  async getFunnel(tenantId: string) {
    const [newLeads, contacted, qualified, converted, wonDeals] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, status: 'NEW' } }),
      this.prisma.lead.count({ where: { tenantId, status: 'CONTACTED' } }),
      this.prisma.lead.count({ where: { tenantId, status: 'QUALIFIED' } }),
      this.prisma.lead.count({ where: { tenantId, status: 'CONVERTED' } }),
      this.prisma.deal.count({ where: { tenantId, status: 'WON' } }),
    ]);

    const totalLeads = newLeads + contacted + qualified + converted + wonDeals;

    const pct = (n: number) =>
      totalLeads > 0 ? Math.round((n / totalLeads) * 100 * 10) / 10 : 0;

    return {
      stages: [
        { name: 'New Leads', count: newLeads + contacted + qualified + converted + wonDeals, percentage: 100 },
        { name: 'Contacted', count: contacted + qualified + converted + wonDeals, percentage: pct(contacted + qualified + converted + wonDeals) },
        { name: 'Qualified', count: qualified + converted + wonDeals, percentage: pct(qualified + converted + wonDeals) },
        { name: 'Converted to Deal', count: converted + wonDeals, percentage: pct(converted + wonDeals) },
        { name: 'Deals Won (Closed)', count: wonDeals, percentage: pct(wonDeals) },
      ],
    };
  }

  // ─── Revenue Trend (Last 6 Months) ───────────────────────────────────────
  async getRevenueTrend(tenantId: string) {
    const now = new Date();
    const months: { month: string; revenue: number; invoiceCount: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId,
          status: 'PAID',
          paidAt: { gte: start, lte: end },
        },
        select: { amount: true },
      });

      months.push({
        month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: invoices.reduce((s, x) => s + x.amount, 0),
        invoiceCount: invoices.length,
      });
    }

    return { trend: months };
  }

  // ─── Lead Source Breakdown ────────────────────────────────────────────────
  async getLeadSources(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { tenantId },
      select: { source: true },
    });

    const sourceCounts: Record<string, number> = {};
    for (const lead of leads) {
      const src = lead.source ?? 'MANUAL';
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
    }

    return Object.entries(sourceCounts).map(([source, count]) => ({ source, count }));
  }

  // ─── API Performance Metrics & System Audit Trails ─────────────────────────
  async getApiPerformanceMetrics(tenantId: string): Promise<ApiMetricsSummary> {
    return this.eventStore.getApiPerformanceMetrics(tenantId);
  }

  async getAuditLogs(tenantId: string, limit = 100): Promise<AuditEventPayload[]> {
    return this.eventStore.getAuditLogs(tenantId, limit);
  }

  async logCustomEvent(payload: AuditEventPayload): Promise<void> {
    return this.eventStore.logEvent(payload);
  }
}
