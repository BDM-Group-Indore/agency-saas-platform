'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
  Activity
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

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Analytics Datasets
  const fetchAnalytics = async () => {
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
      console.error('Failed to retrieve analytics dashboard:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // PDF Report Simulator
  const handleGenerateReport = () => {
    alert('Generating analytical ROI PDF report... Check your browser downloads in a few moments.');
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

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  };

  // Calculate highest revenue month for chart styling scale
  const maxRevenue = revenueTrend.length > 0 ? Math.max(...revenueTrend.map(r => r.revenue)) : 1;

  // Calculate total leads count for source percentage calculations
  const totalLeadsCount = leadSources.reduce((s, x) => s + x.count, 0);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Marketing Funnel & Financial ROI Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Deep dive lead attribution channels, sales conversion cohorts, and invoice revenue flows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload Stats
          </Button>
          <Button variant="primary" size="sm" onClick={handleGenerateReport}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> PDF Report
          </Button>
        </div>
      </div>

      {isLoading ? (
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
                    // Height percentage for bar
                    const heightPct = maxRevenue > 0 ? (pt.revenue / maxRevenue) * 80 + 10 : 10;
                    
                    return (
                      <div key={pt.month} className="flex flex-col items-center gap-2 flex-1 group relative">
                        {/* Tooltip on Hover */}
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
      )}

    </div>
  );
}
