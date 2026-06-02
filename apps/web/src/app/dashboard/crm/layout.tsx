'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Kanban, Users, Building2, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const crmTabs = [
    { name: 'Deals Pipeline', path: '/dashboard/crm', icon: Kanban },
    { name: 'Contacts Directory', path: '/dashboard/crm/contacts', icon: Users },
    { name: 'Companies Index', path: '/dashboard/crm/companies', icon: Building2 },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Dynamic Sub-header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-dark-border pb-1 gap-4 shrink-0">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {crmTabs.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <button
                key={tab.name}
                onClick={() => router.push(tab.path)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-premium cursor-pointer border border-transparent',
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/15'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Global indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wide self-start sm:self-auto">
          <Briefcase className="w-3 h-3 text-primary animate-pulse" />
          <span>Active Pipeline Valuation: $38,900</span>
        </div>
      </div>

      {/* Main Subpage Content */}
      <div className="flex-1 min-h-0">
        {children}
      </div>

    </div>
  );
}
