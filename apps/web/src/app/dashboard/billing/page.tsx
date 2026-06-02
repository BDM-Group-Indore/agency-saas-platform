'use client';

import React from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreditCard, Download, ShieldCheck, CheckCircle2, DollarSign, Layers } from 'lucide-react';

export default function BillingPage() {
  const invoices = [
    { id: 'INV-9021', date: '2026-06-01', amount: '$4,280.00', status: 'Paid', plan: 'Enterprise Scale' },
    { id: 'INV-8812', date: '2026-05-01', amount: '$4,280.00', status: 'Paid', plan: 'Enterprise Scale' },
    { id: 'INV-7612', date: '2026-04-01', amount: '$3,800.00', status: 'Paid', plan: 'Agency Pro' },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Financial Ledger & Billing System
          </h2>
          <p className="text-xs text-slate-400">
            Manage your subscription tier, credit cards, and invoice history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Update Payment Method
          </Button>
          <Button variant="primary" size="sm">
            Upgrade Tier
          </Button>
        </div>
      </div>

      {/* Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Current Subscription Plan" value="Enterprise Scale" icon={<Layers className="w-5 h-5 text-indigo-500" />} subtitle="Renews on July 01, 2026" />
        <StatsCard title="Billing Cycle Rate" value="$4,280.00 / mo" icon={<DollarSign className="w-5 h-5 text-amber-500" />} subtitle="Auto-charged to Visa •••• 4242" />
        <StatsCard title="Security Level Check" value="Level-1 Compliant" icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />} subtitle="Stripe Secure Gateway enabled" />
      </div>

      {/* Invoice Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Invoice table */}
        <Card className="lg:col-span-2 flex flex-col gap-4">
          <div className="border-b border-slate-200 dark:border-dark-border pb-3">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
              Platform Invoices History
            </h3>
            <p className="text-xs text-slate-400">
              Download receipt PDF transcripts for tax or accounting filings.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pt-2">Invoice Code</th>
                  <th className="pb-3 pt-2">Billed Date</th>
                  <th className="pb-3 pt-2">Charged Plan</th>
                  <th className="pb-3 pt-2 text-right">Amount</th>
                  <th className="pb-3 pt-2 text-center">Status</th>
                  <th className="pb-3 pt-2 text-center">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="py-3 font-mono font-bold text-primary">{inv.id}</td>
                    <td className="py-3">{inv.date}</td>
                    <td className="py-3 font-semibold text-slate-800 dark:text-slate-250">{inv.plan}</td>
                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white">{inv.amount}</td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold uppercase text-[9px]">
                        <CheckCircle2 className="w-3 h-3" /> {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => alert(`Downloading pdf ledger for ${inv.id}`)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Active Card details */}
        <Card className="flex flex-col gap-4">
          <div className="border-b border-slate-200 dark:border-dark-border pb-3">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
              Payment Gateway Credentials
            </h3>
            <p className="text-xs text-slate-400">
              Active credit card logs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-indigo-900 text-white relative overflow-hidden flex flex-col gap-4 shadow-xl border border-indigo-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">VISA BUSINESS PLATINUM</span>
              <CreditCard className="w-6 h-6 text-indigo-200" />
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-sm font-mono tracking-widest font-bold">••••  ••••  ••••  4242</span>
              <div className="flex justify-between items-center text-[10px] text-indigo-200 mt-1">
                <span>SHIVAM GUPTA</span>
                <span>EXP: 09/28</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}
