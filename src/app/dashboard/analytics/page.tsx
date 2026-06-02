'use client';

import React from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BarChart3, TrendingUp, Calendar, Download, PieChart, AreaChart, LineChart } from 'lucide-react';

export default function AnalyticsPage() {
  const funnelStages = [
    { name: 'Ad Impressions', count: 185200, percentage: 100 },
    { name: 'Ad Clicks (CTR 2.4%)', count: 4440, percentage: 2.4 },
    { name: 'Captured Leads', count: 1582, percentage: 35.6 },
    { name: 'Qualified Prospects', count: 1202, percentage: 76.0 },
    { name: 'Deals Closed (Closed Won)', count: 42, percentage: 3.5 },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Marketing Funnel & ROI Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Deep dive data attribution, campaign cohorts, and spending indexes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Date: Last 30 Days
          </Button>
          <Button variant="primary" size="sm">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Generate PDF Report
          </Button>
        </div>
      </div>

      {/* Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Client ROAS" value="3.82x" icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} trend={{ value: 12.8, isPositive: true }} subtitle="vs Q1 baseline" />
        <StatsCard title="Cost Per Thousand (CPM)" value="$14.20" icon={<AreaChart className="w-5 h-5 text-indigo-500" />} subtitle="Weighted cross-network CPM" />
        <StatsCard title="Click Through Rate" value="2.44%" icon={<LineChart className="w-5 h-5 text-cyan-500" />} trend={{ value: 0.8, isPositive: true }} subtitle="Aggregated platform click speed" />
      </div>

      {/* Funnel Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Funnel Graphics Card */}
        <Card className="lg:col-span-2 flex flex-col gap-5">
          <div className="border-b border-slate-200 dark:border-dark-border pb-3">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
              Agency Conversion Funnel
            </h3>
            <p className="text-xs text-slate-400">
              Shows prospects drop-off metrics across the marketing flow.
            </p>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            {funnelStages.map((stage, idx) => (
              <div key={stage.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">{stage.name}</span>
                  <span className="text-slate-400 font-mono">
                    {stage.count.toLocaleString()} ({stage.percentage}%)
                  </span>
                </div>
                {/* Horizontal Funnel Bar with dynamic width */}
                <div className="w-full h-8 bg-slate-100 dark:bg-slate-800/40 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-850 flex items-center px-3 relative">
                  <div
                    className="h-full bg-gradient-to-r from-primary/20 to-accent/20 absolute left-0 top-0 border-r-2 border-primary"
                    style={{ width: `${100 - idx * 18}%` }}
                  />
                  <span className="text-[10px] font-bold text-slate-400 relative z-10">
                    STAGE {idx + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Cohort Table */}
        <Card className="flex flex-col gap-4">
          <div className="border-b border-slate-200 dark:border-dark-border pb-3">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
              Monthly Spent Cohorts
            </h3>
            <p className="text-xs text-slate-400">
              User conversions by signup month.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {[
              { month: 'March 2026', spend: '$12,400', conv: '4.2%', leads: 310 },
              { month: 'April 2026', spend: '$15,800', conv: '4.8%', leads: 385 },
              { month: 'May 2026', spend: '$18,500', conv: '5.1%', leads: 420 },
            ].map((c) => (
              <div key={c.month} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/50 text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-slate-50">{c.month}</span>
                  <span className="text-[10px] text-slate-400">Spend: {c.spend}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary block">{c.conv} Conv.</span>
                  <span className="text-[10px] text-slate-400">{c.leads} Leads</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
