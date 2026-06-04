import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'focus-enterprise inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-premium disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          {
            'min-h-8 px-3 py-1.5 text-xs': size === 'sm',
            'min-h-10 px-4 py-2.5 text-sm': size === 'md',
            'min-h-12 px-5 py-3 text-base': size === 'lg',
          },
          {
            'bg-primary text-white shadow-enterprise-sm hover:bg-primary-hover hover:shadow-enterprise-md hover:-translate-y-px active:translate-y-0': variant === 'primary',
            'border border-[color:var(--app-border)] bg-[color:var(--app-surface-secondary)] text-[color:var(--app-text)] hover:bg-[color:var(--app-surface)]': variant === 'secondary',
            'border border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text)] shadow-enterprise-xs hover:border-primary/40 hover:text-primary': variant === 'outline',
            'bg-danger text-white shadow-enterprise-sm hover:brightness-95 hover:shadow-enterprise-md': variant === 'danger',
            'bg-transparent text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-secondary)] hover:text-[color:var(--app-text)]': variant === 'ghost',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
