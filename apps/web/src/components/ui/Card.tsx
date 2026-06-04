import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'enterprise-card enterprise-card-hover p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export const StatsCard = ({ title, value, icon, trend, subtitle, className, ...props }: StatsCardProps) => {
  return (
    <Card className={cn('relative overflow-hidden group', className)} {...props}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--app-text-muted)]">
            {title}
          </span>
          <span className="text-2xl md:text-3xl font-display font-black tracking-tight text-[color:var(--app-text)]">
            {value}
          </span>
        </div>
        {icon && (
          <div className="rounded-lg border border-primary/15 bg-primary/10 p-2.5 text-primary transition-premium group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-rose-500/10 text-rose-500'
            )}
          >
            {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
        {subtitle && (
          <span className="text-xs font-medium text-[color:var(--app-text-muted)]">
            {subtitle}
          </span>
        )}
      </div>
    </Card>
  );
};

interface ProfileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  role: string;
  email: string;
  avatarUrl?: string;
  status?: 'active' | 'inactive';
}

export const ProfileCard = ({ name, role, email, avatarUrl, status = 'active', className, ...props }: ProfileCardProps) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card className={cn('flex items-center gap-4', className)} {...props}>
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-12 h-12 rounded-full object-cover border border-[color:var(--app-border)]"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary text-white font-display font-semibold flex items-center justify-center text-sm shadow-enterprise-sm">
            {initials}
          </div>
        )}
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[color:var(--app-surface)]',
            status === 'active' ? 'bg-success' : 'bg-[color:var(--app-text-muted)]'
          )}
        />
      </div>

      <div className="flex flex-col">
        <span className="font-semibold text-[color:var(--app-text)] text-sm leading-tight">
          {name}
        </span>
        <span className="text-xs text-primary font-medium">
          {role}
        </span>
        <span className="text-xs text-[color:var(--app-text-muted)] mt-0.5">
          {email}
        </span>
      </div>
    </Card>
  );
};
