'use client';

import React, { useState } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { mockLeads, Lead } from '@/data/mockData';
import { UserPlus, UserCheck, Flame, MessageSquare, Plus, Download, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeadsPage() {
  const [leads] = useState<Lead[]>(mockLeads);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');

  const filteredLeads = leads.filter(l => {
    const matchSearch = l.leadName.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search);
    const matchSource = sourceFilter === 'All' || l.source === sourceFilter;
    return matchSearch && matchSource;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Lead Distribution & Pipelines
          </h2>
          <p className="text-xs text-slate-400">
            Realtime captures, routing statuses, and conversion benchmarks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => alert('Exported Leads to Excel')}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Import Leads
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Capture Speed" value="2.4 seconds" icon={<Flame className="w-5 h-5 text-amber-500" />} subtitle="Facebook API & Webhook" />
        <StatsCard title="Qualified Lead Ratio" value="76.2%" icon={<UserCheck className="w-5 h-5 text-emerald-500" />} trend={{ value: 4.8, isPositive: true }} subtitle="vs Q1 baseline" />
        <StatsCard title="AI Outreach Completed" value="1,240 leads" icon={<MessageSquare className="w-5 h-5 text-indigo-500" />} subtitle="91% follow-up efficiency" />
      </div>

      {/* Leads list panel */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 dark:border-dark-border pb-4">
          <div className="flex gap-2 w-full md:max-w-md">
            <Input
              type="search"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="py-1.5"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Filter Channel:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none"
            >
              <option value="All">All Sources</option>
              <option value="Facebook Ads">Facebook Ads</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Instagram Ads">Instagram Ads</option>
              <option value="LinkedIn Outbound">LinkedIn Outbound</option>
              <option value="Google Search">Google Search</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="pb-3 pt-2">ID</th>
                <th className="pb-3 pt-2">Name</th>
                <th className="pb-3 pt-2">Source</th>
                <th className="pb-3 pt-2">Timeline Created</th>
                <th className="pb-3 pt-2">Assigned Agent</th>
                <th className="pb-3 pt-2">Lead Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
              {filteredLeads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="py-3 font-mono font-bold text-primary">{l.id}</td>
                  <td className="py-3 text-slate-900 dark:text-slate-50 font-bold">{l.leadName}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-primary">{l.source}</span>
                  </td>
                  <td className="py-3">{l.dateCreated}</td>
                  <td className="py-3">{l.assignedTo}</td>
                  <td className="py-3 text-slate-900 dark:text-slate-50 font-bold">${l.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
