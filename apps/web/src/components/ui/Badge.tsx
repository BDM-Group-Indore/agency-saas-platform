import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'sm', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide',
        {
          'px-2 py-0.5 text-[10px]': size === 'sm',
          'px-2.5 py-1 text-xs': size === 'md',
        },
        {
          'border-[color:var(--app-border)] bg-[color:var(--app-surface-secondary)] text-[color:var(--app-text-muted)]': variant === 'default',
          'border-primary/20 bg-primary/10 text-primary': variant === 'primary',
          'border-success/20 bg-success/10 text-success': variant === 'success',
          'border-warning/25 bg-warning/10 text-warning': variant === 'warning',
          'border-danger/20 bg-danger/10 text-danger': variant === 'danger',
          'border-[color:var(--app-border)] bg-transparent text-[color:var(--app-text-muted)]': variant === 'neutral',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
