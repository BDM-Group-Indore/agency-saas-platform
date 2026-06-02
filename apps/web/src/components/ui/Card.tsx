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
        'glass-panel rounded-xl p-5 transition-premium hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80',
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
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <span className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {value}
          </span>
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-primary dark:text-primary transition-colors group-hover:scale-110 duration-300">
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
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
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
            className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-dark-border"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent text-white font-display font-semibold flex items-center justify-center text-sm shadow-md">
            {initials}
          </div>
        )}
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-dark-card',
            status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
          )}
        />
      </div>

      <div className="flex flex-col">
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">
          {name}
        </span>
        <span className="text-xs text-primary dark:text-primary/90 font-medium">
          {role}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {email}
        </span>
      </div>
    </Card>
  );
};
