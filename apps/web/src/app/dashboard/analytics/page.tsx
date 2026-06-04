'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  PieChart,
  AreaChart,
  LineChart,
  MessageSquare,
  Users,
  Award,
  DollarSign,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  Activity,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  Globe,
  Plus,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsSummary {
  totalLeads: number;
  leadsThisMonth: number;
  leadsGrowthPct: number;
  totalDeals: number;
  totalDealsValue: number;
  wonDealsValue: number;
  conversionRate: number;
  openConversations: number;
  totalCampaigns: number;
  totalRevenue: number;
}

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
}

interface RevenuePoint {
  month: string;
  revenue: number;
  invoiceCount: number;
}

interface LeadSource {
  source: string;
  count: number;
}

interface ApiMetricsTrendPoint {
  timestamp: string;
  requestCount: number;
  avgLatency: number;
}

interface ApiMetricsData {
  totalRequests: number;
  averageLatency: number;
  statusDistribution: Record<string, number>;
  trend: ApiMetricsTrendPoint[];
}

interface AuditLogEvent {
  id?: string;
  tenantId: string;
  userId?: string;
  event: string;
  status: string;
  meta?: Record<string, any>;
  ipAddress?: string;
  duration?: number;
  timestamp: string;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'marketing' | 'performance' | 'audit-logs'>('marketing');

  // Marketing Analytics State
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // System Performance State
  const [performanceData, setPerformanceData] = useState<ApiMetricsData | null>(null);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);

  // Security Audit Trails State
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logsLimit, setLogsLimit] = useState(100);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Custom event logging form state
  const [newEvent, setNewEvent] = useState({
    event: 'USER_LOGIN',
    status: 'SUCCESS',
    meta: '{\n  "source": "system_portal",\n  "device": "desktop"\n}',
    ipAddress: '',
    duration: '',
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Fetch Marketing Analytics
  const fetchMarketing = async () => {
    try {
      setIsLoading(true);
      const [summaryRes, funnelRes, revenueRes, sourcesRes] = await Promise.all([
        apiRequest('/analytics/summary'),
        apiRequest('/analytics/funnel'),
        apiRequest('/analytics/revenue'),
        apiRequest('/analytics/lead-sources'),
      ]);

      setSummary(summaryRes || null);
      setFunnel(funnelRes?.stages || []);
      setRevenueTrend(revenueRes?.trend || []);
      setLeadSources(sourcesRes || []);
    } catch (err: any) {
      console.error('Failed to retrieve marketing analytics:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch API Performance Metrics
  const fetchPerformance = async () => {
    try {
      setIsPerformanceLoading(true);
      const data = await apiRequest('/analytics/api-metrics');
      setPerformanceData(data || null);
    } catch (err: any) {
      console.error('Failed to retrieve performance metrics:', err.message);
    } finally {
      setIsPerformanceLoading(false);
    }
  };

  // Fetch Security Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setIsLogsLoading(true);
      const data = await apiRequest(`/analytics/audit-logs?limit=${logsLimit}`);
      setAuditLogs(data || []);
    } catch (err: any) {
      console.error('Failed to retrieve audit logs:', err.message);
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Sync state triggers depending on the selected tab
  useEffect(() => {
    if (activeTab === 'marketing') {
      fetchMarketing();
    } else if (activeTab === 'performance') {
      fetchPerformance();
    } else if (activeTab === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [activeTab, logsLimit]);

  // PDF Report Simulator
  const handleGenerateReport = () => {
    alert('Generating analytical ROI PDF report... Check your browser downloads in a few moments.');
  };

  // Manual Custom Event Logger submission handler
  const handleLogEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);

    let parsedMeta: Record<string, any> = {};
    if (newEvent.meta.trim()) {
      try {
        parsedMeta = JSON.parse(newEvent.meta);
      } catch (err: any) {
        setJsonError(`Invalid JSON syntax in metadata: ${err.message}`);
        return;
      }
    }

    try {
      setIsSubmittingEvent(true);
      await apiRequest('/analytics/events', {
        method: 'POST',
        body: JSON.stringify({
          event: newEvent.event,
          status: newEvent.status,
          meta: parsedMeta,
          ipAddress: newEvent.ipAddress || undefined,
          duration: newEvent.duration ? parseInt(newEvent.duration, 10) : undefined,
        }),
      });

      setIsModalOpen(false);
      // Reset form fields
      setNewEvent({
        event: 'USER_LOGIN',
        status: 'SUCCESS',
        meta: '{\n  "source": "system_portal",\n  "device": "desktop"\n}',
        ipAddress: '',
        duration: '',
      });
      fetchAuditLogs();
    } catch (err: any) {
      alert(`Failed to record custom event: ${err.message}`);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Helper colors for Lead Sources progress bars
  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      WEB_FORM: 'bg-indigo-500',
      MANUAL: 'bg-emerald-500',
      COLD_OUTREACH: 'bg-amber-500',
      REFERRAL: 'bg-pink-500',
      'Facebook Ads': 'bg-blue-600',
      'Google Ads': 'bg-cyan-500',
    };
    return colors[source] || 'bg-slate-500';
  };

  // Code/Event Badging Colors
  const getStatusCodeBadgeColor = (code: string) => {
    const codeNum = parseInt(code, 10);
    if (codeNum >= 200 && codeNum < 300) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 border border-emerald-500/20';
    if (codeNum >= 300 && codeNum < 400) return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30 border border-blue-500/20';
    if (codeNum >= 400 && codeNum < 500) return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 border border-amber-500/20';
    return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30 border border-rose-500/20';
  };

  const getEventBadgeColor = (event: string) => {
    switch (event) {
      case 'API_REQUEST':
        return 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50';
      case 'USER_LOGIN':
        return 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30 border border-indigo-500/20';
      case 'LEAD_CREATED':
        return 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/30 border border-cyan-500/20';
      case 'INVOICE_PAID':
        return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 border border-emerald-500/20';
      case 'PASSWORD_RESET':
      case 'PASSWORD_CHANGED':
        return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30 border border-rose-500/20';
      default:
        return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 border border-amber-500/20';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const isSuccess = status === 'SUCCESS' || status.startsWith('2') || status.startsWith('3');
    return isSuccess
      ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 border border-emerald-500/20'
      : 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30 border border-rose-500/20';
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  };

  const calculateSuccessRate = (dist: Record<string, number>) => {
    let success = 0;
    let total = 0;
    Object.entries(dist).forEach(([code, count]) => {
      const parsedCode = parseInt(code, 10);
      if (parsedCode < 400 || isNaN(parsedCode)) {
        success += count;
      }
      total += count;
    });
    return total > 0 ? Math.round((success / total) * 100 * 10) / 10 : 100;
  };

  // Filter logs locally based on search queries
  const filteredLogs = auditLogs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      log.event.toLowerCase().includes(query) ||
      (log.userId && log.userId.toLowerCase().includes(query)) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(query)) ||
      (log.status && log.status.toLowerCase().includes(query))
    );
  });

  const maxRevenue = revenueTrend.length > 0 ? Math.max(...revenueTrend.map(r => r.revenue)) : 1;
  const totalLeadsCount = leadSources.reduce((s, x) => s + x.count, 0);

  const maxRequests = performanceData && performanceData.trend.length > 0
    ? Math.max(...performanceData.trend.map(t => t.requestCount))
    : 1;

  const maxLatency = performanceData && performanceData.trend.length > 0
    ? Math.max(...performanceData.trend.map(t => t.avgLatency))
    : 1;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            System & Operations Cohort Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Monitor marketing funnel ROI, capture real-time API latency profiles, and query tenant audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'marketing' && (
            <>
              <Button variant="outline" size="sm" onClick={fetchMarketing}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload Stats
              </Button>
              <Button variant="primary" size="sm" onClick={handleGenerateReport}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> PDF Report
              </Button>
            </>
          )}
          {activeTab === 'performance' && (
            <Button variant="outline" size="sm" onClick={fetchPerformance}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Metrics
            </Button>
          )}
          {activeTab === 'audit-logs' && (
            <>
              <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload Logs
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Dispatch Custom Event
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tab Switched Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('marketing')}
          className={cn(
            'pb-3 border-b-2 transition-all relative top-[2px] px-1',
            activeTab === 'marketing'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          )}
        >
          Marketing & ROI Analytics
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={cn(
            'pb-3 border-b-2 transition-all relative top-[2px] px-1',
            activeTab === 'performance'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          )}
        >
          System & API Performance
        </button>
        <button
          onClick={() => setActiveTab('audit-logs')}
          className={cn(
            'pb-3 border-b-2 transition-all relative top-[2px] px-1',
            activeTab === 'audit-logs'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          )}
        >
          Security Audit Trails
        </button>
      </div>

      {/* Tab 1: Marketing & ROI */}
      {activeTab === 'marketing' && (
        isLoading ? (
          <div className="py-24 text-center text-slate-400 font-medium">
            Aggregating dashboard cohorts...
          </div>
        ) : (
          <>
            {/* Row KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Aggregate Invoice Revenue"
                value={summary ? formatCurrency(summary.totalRevenue) : '$0'}
                icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
                subtitle="From paid ledger accounts"
              />
              <StatsCard
                title="Deal Pipeline Value"
                value={summary ? formatCurrency(summary.totalDealsValue) : '$0'}
                icon={<AreaChart className="w-5 h-5 text-indigo-500" />}
                subtitle={`${summary?.totalDeals || 0} active opportunities`}
              />
              <StatsCard
                title="Leads Captures This Month"
                value={summary ? summary.leadsThisMonth.toString() : '0'}
                icon={<Users className="w-5 h-5 text-cyan-500" />}
                trend={summary?.leadsGrowthPct ? { value: summary.leadsGrowthPct, isPositive: summary.leadsGrowthPct >= 0 } : undefined}
                subtitle="Captured via webforms & channels"
              />
              <StatsCard
                title="Pipeline Conversion Rate"
                value={summary ? `${summary.conversionRate}%` : '0%'}
                icon={<Award className="w-5 h-5 text-amber-500" />}
                subtitle="Leads won into client accounts"
              />
            </div>

            {/* Funnel and Sources Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Funnel Graphic Card */}
              <Card className="lg:col-span-2 flex flex-col gap-5">
                <div className="border-b border-slate-200 dark:border-dark-border pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                      Lead-to-Deal Conversion Funnel
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tracks prospect volume retention and drop-off levels across critical stages.
                    </p>
                  </div>
                  <Activity className="w-5 h-5 text-slate-400" />
                </div>

                <div className="flex flex-col gap-4 mt-1">
                  {funnel.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-medium">
                      No leads or deals detected under current tenant context.
                    </div>
                  ) : (
                    funnel.map((stage, idx) => (
                      <div key={stage.name} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                              {idx + 1}
                            </span>
                            {stage.name}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {stage.count.toLocaleString()} ({stage.percentage}%)
                          </span>
                        </div>
                        
                        {/* Custom Horizontal bar graphic */}
                        <div className="w-full h-8 bg-slate-100 dark:bg-slate-800/40 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-850 flex items-center px-3 relative">
                          <div
                            className="h-full bg-gradient-to-r from-primary/15 to-accent/20 absolute left-0 top-0 border-r-2 border-primary transition-all duration-500"
                            style={{ width: `${stage.percentage}%` }}
                          />
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 relative z-10">
                            {stage.percentage === 100 ? 'ENTERING FLOW' : `RETENTION: ${stage.percentage}%`}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Right Lead Source Distribution */}
              <Card className="flex flex-col gap-4">
                <div className="border-b border-slate-200 dark:border-dark-border pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                      Lead Channel Distribution
                    </h3>
                    <p className="text-xs text-slate-400">
                      Lead volumes grouped by campaign sources.
                    </p>
                  </div>
                  <PieChart className="w-5 h-5 text-slate-400" />
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  {leadSources.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-medium">
                      No lead source data logs found.
                    </div>
                  ) : (
                    leadSources.map((src) => {
                      const pct = totalLeadsCount > 0 ? Math.round((src.count / totalLeadsCount) * 100) : 0;
                      
                      return (
                        <div key={src.source} className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
                              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', getSourceColor(src.source))} />
                              {src.source}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {src.count} ({pct}%)
                            </span>
                          </div>
                          {/* Horizontal thin progress bar */}
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/40 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-500', getSourceColor(src.source))}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

            </div>

            {/* Revenue Trend Section */}
            <Card className="flex flex-col gap-5">
              <div className="border-b border-slate-200 dark:border-dark-border pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                    Monthly Revenue Trend (Last 6 Months)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Displays successfully collected invoice revenue volume by payment date.
                  </p>
                </div>
                <LineChart className="w-5 h-5 text-slate-400" />
              </div>

              {revenueTrend.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-medium">
                  No revenue logs detected. Log invoice payments under Billing to construct visual trendlines.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-2">
                  
                  {/* Custom CSS Chart Visualization */}
                  <div className="flex justify-between items-end h-48 px-4 pb-2 border-b border-slate-200 dark:border-slate-800 relative">
                    {revenueTrend.map((pt) => {
                      const heightPct = maxRevenue > 0 ? (pt.revenue / maxRevenue) * 80 + 10 : 10;
                      
                      return (
                        <div key={pt.month} className="flex flex-col items-center gap-2 flex-1 group relative">
                          <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center font-mono min-w-[70px]">
                            {formatCurrency(pt.revenue)}
                            <br />
                            {pt.invoiceCount} paid inv
                          </div>
                          
                          {/* Vertical Bar */}
                          <div className="w-8 sm:w-12 bg-gradient-to-t from-primary/10 to-primary hover:to-accent hover:from-primary/25 rounded-t transition-all duration-350 cursor-pointer shadow-sm" style={{ height: `${heightPct}%` }} />
                          
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            {pt.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cohort Metric breakdown list */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5">Monthly Ledger Breakdowns</span>
                    <div className="flex flex-col gap-2.5 max-h-[35vh] overflow-y-auto pr-1">
                      {revenueTrend.map((pt) => (
                        <div key={pt.month} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/40 dark:bg-slate-800/20 border border-slate-200/40 dark:border-slate-800/40 text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-50">{pt.month} Monthly Cohort</span>
                            <span className="text-[10px] text-slate-400">{pt.invoiceCount} invoices successfully settled</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                              {formatCurrency(pt.revenue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </Card>
          </>
        )
      )}

      {/* Tab 2: System & API Performance */}
      {activeTab === 'performance' && (
        isPerformanceLoading ? (
          <div className="py-24 text-center text-slate-400 font-medium">
            Aggregating performance profiles...
          </div>
        ) : !performanceData ? (
          <div className="py-24 text-center text-slate-400 font-medium">
            Failed to load API telemetry data. Make sure backend endpoints are active.
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total API Calls"
                value={performanceData.totalRequests.toLocaleString()}
                icon={<Activity className="w-5 h-5 text-indigo-500" />}
                subtitle="Logged API transactions"
              />
              <StatsCard
                title="Average Response Time"
                value={`${performanceData.averageLatency} ms`}
                icon={<Clock className="w-5 h-5 text-amber-500" />}
                subtitle="Aggregated route latency"
              />
              <StatsCard
                title="API Success Rate"
                value={`${calculateSuccessRate(performanceData.statusDistribution)}%`}
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                subtitle="Successful transactions ratio"
              />
              <StatsCard
                title="Service Status"
                value={
                  calculateSuccessRate(performanceData.statusDistribution) < 95
                    ? 'DEGRADED'
                    : 'OPERATIONAL'
                }
                icon={<Cpu className="w-5 h-5 text-cyan-500" />}
                subtitle="Dynamic service cluster check"
              />
            </div>

            {/* Performance Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Traffic Load Graph */}
              <Card className="flex flex-col gap-4">
                <div className="border-b border-slate-200 dark:border-dark-border pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                      API Traffic Load (Last 24 Hours)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Shows the distribution of request volumes captured hourly.
                    </p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>

                {performanceData.trend.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 font-medium">
                    No traffic volume data registered in the last 24 hours.
                  </div>
                ) : (
                  <div className="flex justify-between items-end h-48 px-4 pb-2 mt-4 border-b border-slate-200 dark:border-slate-800 relative">
                    {performanceData.trend.map((pt) => {
                      const heightPct = maxRequests > 0 ? (pt.requestCount / maxRequests) * 80 + 10 : 10;
                      return (
                        <div key={pt.timestamp} className="flex flex-col items-center gap-2 flex-1 group relative">
                          <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center font-mono min-w-[75px]">
                            {pt.requestCount} calls
                            <br />
                            {new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="w-4 sm:w-6 bg-gradient-to-t from-indigo-500/10 to-indigo-500 hover:to-indigo-400 rounded-t transition-all duration-350 cursor-pointer shadow-sm" style={{ height: `${heightPct}%` }} />
                          <span className="text-[8px] font-bold text-slate-400 tracking-wider font-mono">
                            {new Date(pt.timestamp).getHours()}:00
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Latency Graph */}
              <Card className="flex flex-col gap-4">
                <div className="border-b border-slate-200 dark:border-dark-border pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                      Average Request Latency (Last 24 Hours)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tracks performance speed and responsive response delays.
                    </p>
                  </div>
                  <LineChart className="w-5 h-5 text-slate-400" />
                </div>

                {performanceData.trend.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 font-medium">
                    No latency statistics registered in the last 24 hours.
                  </div>
                ) : (
                  <div className="flex justify-between items-end h-48 px-4 pb-2 mt-4 border-b border-slate-200 dark:border-slate-800 relative">
                    {performanceData.trend.map((pt) => {
                      const heightPct = maxLatency > 0 ? (pt.avgLatency / maxLatency) * 80 + 10 : 10;
                      return (
                        <div key={pt.timestamp} className="flex flex-col items-center gap-2 flex-1 group relative">
                          <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center font-mono min-w-[75px]">
                            {pt.avgLatency} ms
                            <br />
                            {new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="w-4 sm:w-6 bg-gradient-to-t from-amber-500/10 to-amber-500 hover:to-amber-400 rounded-t transition-all duration-350 cursor-pointer shadow-sm" style={{ height: `${heightPct}%` }} />
                          <span className="text-[8px] font-bold text-slate-400 tracking-wider font-mono">
                            {new Date(pt.timestamp).getHours()}:00
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

            </div>

            {/* HTTP Response status code distributions */}
            <Card className="flex flex-col gap-4">
              <div className="border-b border-slate-200 dark:border-dark-border pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                    HTTP Response Status Distributions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Shows success rates and error trends sorted by HTTP status code return categories.
                  </p>
                </div>
                <Terminal className="w-5 h-5 text-slate-400" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {Object.keys(performanceData.statusDistribution).length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-400">
                    No status codes registered yet.
                  </div>
                ) : (
                  Object.entries(performanceData.statusDistribution).map(([code, count]) => {
                    const percentage = performanceData.totalRequests > 0 
                      ? Math.round((count / performanceData.totalRequests) * 100 * 10) / 10 
                      : 0;

                    return (
                      <div key={code} className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center justify-between">
                          <span className={cn('text-xs font-mono font-black px-2 py-0.5 rounded-md', getStatusCodeBadgeColor(code))}>
                            HTTP {code}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            {percentage}%
                          </span>
                        </div>
                        <div className="flex flex-col mt-1">
                          <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                            {count.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400">Request Occurrences</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </>
        )
      )}

      {/* Tab 3: Security Audit Trails */}
      {activeTab === 'audit-logs' && (
        <Card className="flex flex-col gap-4">
          
          {/* Controls toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-dark-border pb-4">
            <div className="w-full md:max-w-md">
              <Input
                type="search"
                placeholder="Search by event type, user, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-400 font-medium">Log limits:</span>
              <div className="flex gap-1.5">
                {[50, 100, 200].map((lim) => (
                  <button
                    key={lim}
                    onClick={() => setLogsLimit(lim)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all',
                      logsLimit === lim
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                  >
                    {lim} rows
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Logs List Table */}
          {isLogsLoading ? (
            <div className="py-24 text-center text-slate-400 font-medium">
              Retrieving operational event logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-24 text-center text-slate-400 font-medium">
              No matching security event logs found. Make sure client interactions are logging correctly.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50 dark:bg-dark-card/10">
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">User context</th>
                    <th className="py-3 px-4">Client IP</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredLogs.map((log) => {
                    const timeObj = new Date(log.timestamp);
                    const formattedTime = isNaN(timeObj.getTime())
                      ? '-'
                      : `${timeObj.toLocaleDateString()} ${timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

                    return (
                      <tr key={log.id || (log as any)._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-3.5 px-4 font-bold">
                          <span className={cn('px-2 py-0.5 rounded-md font-mono text-[10px]', getEventBadgeColor(log.event))}>
                            {log.event}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[10px]">
                          {log.userId ? log.userId : <span className="text-slate-400 italic">SYSTEM</span>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {log.ipAddress ? (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                              {log.ipAddress}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {log.duration !== undefined ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              {log.duration} ms
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn('px-2 py-0.5 rounded-md font-mono text-[10px] font-black', getStatusBadgeColor(log.status))}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                          {formattedTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Manual Custom Event Dispatcher Dialog Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Dispatch Custom Security Event"
        size="md"
      >
        <form onSubmit={handleLogEventSubmit} className="flex flex-col gap-4">
          <Input
            label="Event Name / Action"
            value={newEvent.event}
            onChange={(e) => setNewEvent({ ...newEvent, event: e.target.value.toUpperCase() })}
            placeholder="e.g. USER_LOGIN, PASSWORD_RESET, INTEGRATION_SYNC"
            required
          />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Event Ingestion Status
            </label>
            <div className="flex gap-2">
              {['SUCCESS', 'FAILED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setNewEvent({ ...newEvent, status: st })}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold rounded-lg border transition-all',
                    newEvent.status === st
                      ? (st === 'SUCCESS' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-rose-600 border-rose-600 text-white')
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Client IP (Optional)"
              value={newEvent.ipAddress}
              onChange={(e) => setNewEvent({ ...newEvent, ipAddress: e.target.value })}
              placeholder="e.g. 192.168.1.1"
            />
            <Input
              label="Execution Latency ms (Optional)"
              type="number"
              value={newEvent.duration}
              onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
              placeholder="e.g. 45"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Event Meta context JSON
            </label>
            <textarea
              className={cn(
                'w-full h-24 text-xs font-mono rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-premium p-3',
                { 'border-danger focus:border-danger': jsonError }
              )}
              value={newEvent.meta}
              onChange={(e) => setNewEvent({ ...newEvent, meta: e.target.value })}
              placeholder='{\n  "source": "manual_action"\n}'
              required
            />
            {jsonError && (
              <p className="text-xs text-danger font-medium mt-0.5">{jsonError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmittingEvent}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingEvent}
            >
              {isSubmittingEvent ? 'Dispatching event...' : 'Log Security Event'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
