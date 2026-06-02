'use client';

import React, { useState } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mockDeals, Deal } from '@/data/mockData';
import { Network, FolderKanban, Plus, DollarSign, Sparkles, Milestone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CRMPage() {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);

  // Group deals by stage
  const stages = ['Proposal', 'Negotiation', 'Contract Sent', 'Closed Won'];
  
  const getDealsByStage = (stage: string) => {
    return deals.filter((d) => d.stage === stage);
  };

  const calculateTotalInStage = (stage: string) => {
    return getDealsByStage(stage).reduce((acc, curr) => acc + curr.amount, 0);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            High Velocity CRM Pipeline
          </h2>
          <p className="text-xs text-slate-400">
            Track deal progressions, pipeline valuations, and conversions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Milestone className="w-3.5 h-3.5 mr-1.5" /> Customize Stages
          </Button>
          <Button variant="primary" size="sm" onClick={() => alert('Mock Create Deal Triggered')}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add New Deal
          </Button>
        </div>
      </div>

      {/* CRM Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Pipeline Value" value="$38,900" icon={<DollarSign className="w-5 h-5 text-indigo-500" />} subtitle="Active sales pipeline" />
        <StatsCard title="Closed Won This Q" value="$18,500" icon={<Sparkles className="w-5 h-5 text-amber-500" />} trend={{ value: 18.4, isPositive: true }} subtitle="vs Q1 closed won" />
        <StatsCard title="Pipeline Growth" value="+24%" icon={<Network className="w-5 h-5 text-emerald-500" />} subtitle="Active contacts indexed" />
      </div>

      {/* Kanban Pipeline Board Grid Mockup */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage);
          const totalVal = calculateTotalInStage(stage);
          
          return (
            <div key={stage} className="flex flex-col gap-3.5 bg-slate-100/50 dark:bg-dark-card/45 border border-slate-200 dark:border-dark-border p-4 rounded-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">{stage}</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  {stageDeals.length}
                </span>
              </div>
              
              <div className="text-[10px] text-slate-400 font-semibold flex justify-between px-1">
                <span>STAGE VALUE:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">${totalVal.toLocaleString()}</span>
              </div>

              {/* Deals container */}
              <div className="flex flex-col gap-3 min-h-[300px] overflow-y-auto max-h-[500px] pr-1">
                {stageDeals.length > 0 ? (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-md transition-premium group relative cursor-pointer"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          {deal.companyName}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-50 group-hover:text-primary transition-colors leading-snug">
                          {deal.dealName}
                        </h4>
                        <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                            ${deal.amount.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Due {deal.closeDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-48 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-[11px] text-slate-400 text-center p-4">
                    Drag and Drop deal cards here (Enabled in Phase 6)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
