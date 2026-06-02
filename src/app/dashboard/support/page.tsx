'use client';

import React from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LifeBuoy, AlertCircle, Clock, BookOpen, Plus, ShieldCheck } from 'lucide-react';

export default function SupportPage() {
  const tickets = [
    { id: 'TKT-1082', subject: 'Facebook Pixel Integration hydration failure', client: 'Apex Health Ltd', priority: 'High', status: 'In Review', sla: '1.2h remaining' },
    { id: 'TKT-1042', subject: 'Custom field mapping error on HubSpot export', client: 'Nexon Digital Corp', priority: 'Medium', status: 'Open', sla: '4.5h remaining' },
    { id: 'TKT-0985', subject: 'Invoice address verification required', client: 'Elite Real Estate', priority: 'Low', status: 'Resolved', sla: 'Met' },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Customer Success & SLA Monitoring
          </h2>
          <p className="text-xs text-slate-400">
            Handle platform support tickets, helpdesk documents, and priority escalations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Read Help Documents
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Open New Ticket
          </Button>
        </div>
      </div>

      {/* Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Mean Resolution Speed" value="2.8 hours" icon={<Clock className="w-5 h-5 text-indigo-500" />} subtitle="SLA commitment: 4.0 hours" />
        <StatsCard title="SLA Compliance Rate" value="98.4%" icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />} trend={{ value: 0.6, isPositive: true }} subtitle="vs last 30 days" />
        <StatsCard title="Unresolved Tickets" value="2 Active" icon={<AlertCircle className="w-5 h-5 text-rose-500" />} subtitle="0 critical bottlenecks" />
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Ticket index table */}
        <Card className="lg:col-span-2 flex flex-col gap-4">
          <div className="border-b border-slate-200 dark:border-dark-border pb-3">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
              Active Client Support Tickets
            </h3>
            <p className="text-xs text-slate-400">
              Assigned issues requiring developer review or client assistance.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pt-2">Ticket ID</th>
                  <th className="pb-3 pt-2">Subject Issue</th>
                  <th className="pb-3 pt-2">Client Account</th>
                  <th className="pb-3 pt-2 text-center">Priority</th>
                  <th className="pb-3 pt-2 text-center">SLA Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="py-3.5 font-mono font-bold text-primary">{t.id}</td>
                    <td className="py-3.5 text-slate-900 dark:text-slate-50 font-bold max-w-xs truncate">{t.subject}</td>
                    <td className="py-3.5 font-semibold text-slate-700 dark:text-slate-350">{t.client}</td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        t.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 text-center text-slate-400 font-semibold">{t.sla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right FAQ cards */}
        <Card className="flex flex-col gap-4">
          <div className="border-b border-slate-200 dark:border-dark-border pb-3">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
              Agency Knowledge base
            </h3>
            <p className="text-xs text-slate-400">
              Help articles for self-service setups.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { title: 'Meta Webhooks callback setup guide', category: 'WhatsApp API' },
              { title: 'Google AdWords OAuth credentials auth key', category: 'Ads Integration' },
              { title: 'Invoice auto formatting settings rules', category: 'Billing ledger' },
            ].map((art) => (
              <div key={art.title} className="p-3 bg-slate-100/50 dark:bg-slate-800/30 border border-slate-250/50 dark:border-slate-800/50 rounded-xl text-xs hover:border-primary transition-colors cursor-pointer">
                <span className="text-[9px] font-bold uppercase text-primary tracking-widest">{art.category}</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mt-1 leading-normal">{art.title}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
