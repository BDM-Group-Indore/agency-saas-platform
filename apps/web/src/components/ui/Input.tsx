import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const isSearch = type === 'search';
    
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {/* Search Icon */}
          {isSearch && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
          )}

          {/* Left Custom Icon */}
          {!isSearch && icon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            type={computedType}
            ref={ref}
            className={cn(
              'w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-premium px-4 py-2.5',
              {
                'pl-10': isSearch || icon,
                'pr-10': isPassword,
                'border-danger focus:border-danger focus:ring-danger/20': error,
              },
              className
            )}
            {...props}
          />

          {/* Password Reveal Icon */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-danger font-medium mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
