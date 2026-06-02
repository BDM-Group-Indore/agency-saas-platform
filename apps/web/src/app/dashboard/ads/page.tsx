'use client';

import React, { useState } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mockCampaigns, Campaign } from '@/data/mockData';
import { Megaphone, RefreshCw, BarChart, Sparkles, Filter, Percent, Globe, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [platformFilter, setPlatformFilter] = useState('All');

  const filteredCampaigns = campaigns.filter(c => platformFilter === 'All' || c.platform === platformFilter);

  const totalSpent = filteredCampaigns.reduce((acc, curr) => acc + curr.spend, 0);
  const totalLeads = filteredCampaigns.reduce((acc, curr) => acc + curr.leadsGenerated, 0);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Ad Operations Command Center
          </h2>
          <p className="text-xs text-slate-400">
            Sync Google Ads, Meta Ads and YouTube Ads into a unified reporting interface.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => alert('Syncing live APIs...')}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" style={{ animationDuration: '3s' }} /> Sync Networks
          </Button>
          <Button variant="primary" size="sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Performance Max Builder
          </Button>
        </div>
      </div>

      {/* Ads Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard title="Aggregated Spent" value={`$${totalSpent.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} subtitle="Active billing cycle" />
        <StatsCard title="Total Leads Generated" value={totalLeads} icon={<BarChart className="w-5 h-5 text-indigo-500" />} subtitle="Pixel & Form capture" />
        <StatsCard title="Average Cost Per Lead" value={`$${(totalSpent / (totalLeads || 1)).toFixed(2)}`} icon={<Percent className="w-5 h-5 text-cyan-500" />} subtitle="Weighted mean score" />
        <StatsCard title="Integrated Accounts" value="3 Active" icon={<Globe className="w-5 h-5 text-emerald-500" />} subtitle="Meta, Google, YouTube" />
      </div>

      {/* Campaign List */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 dark:border-dark-border pb-4">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
            Integrated Campaign Registry
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Filter Platform:</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none"
            >
              <option value="All">All Networks</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="YouTube Ads">YouTube Ads</option>
              <option value="Instagram Ads">Instagram Ads</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="pb-3 pt-2">Campaign Name</th>
                <th className="pb-3 pt-2">Network</th>
                <th className="pb-3 pt-2">Spent / Budget</th>
                <th className="pb-3 pt-2 text-right">Leads</th>
                <th className="pb-3 pt-2 text-right">ROAS</th>
                <th className="pb-3 pt-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
              {filteredCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="py-3.5 text-slate-900 dark:text-slate-50 font-bold">{c.name}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold">{c.platform}</span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex flex-col gap-1 w-44">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">${c.spend} spent / ${c.budget}</span>
                      <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(c.spend / c.budget) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-right font-bold text-slate-900 dark:text-white">{c.leadsGenerated}</td>
                  <td className="py-3.5 text-right font-bold text-primary">{c.roas}x</td>
                  <td className="py-3.5 text-center">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase',
                      c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
                    )}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
