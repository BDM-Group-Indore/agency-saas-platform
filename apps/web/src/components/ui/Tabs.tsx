import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-secondary)] p-1',
        className
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'focus-enterprise inline-flex min-h-8 items-center gap-2 rounded-md px-3 text-xs font-bold transition-premium',
              active
                ? 'bg-[color:var(--app-surface)] text-[color:var(--app-text)] shadow-enterprise-xs'
                : 'text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
