import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--app-text-muted)]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'enterprise-field focus-enterprise w-full appearance-none px-3.5 py-2.5 pr-10 text-sm font-semibold transition-premium',
            error && 'border-danger focus:border-danger',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--app-text-muted)]" />
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  )
);

Select.displayName = 'Select';
