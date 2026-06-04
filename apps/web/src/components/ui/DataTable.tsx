import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './Input';
import { Button } from './Button';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  title?: string;
  description?: string;
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  title,
  description,
  data,
  columns,
  rowKey,
  searchValue,
  onSearchChange,
  actions,
  emptyState,
  className,
}: DataTableProps<T>) {
  return (
    <section className={cn('enterprise-card overflow-hidden', className)}>
      {(title || description || onSearchChange || actions) && (
        <div className="flex flex-col gap-3 border-b border-[color:var(--app-border)] p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold text-[color:var(--app-text)]">{title}</h3>}
            {description && <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">{description}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {onSearchChange && (
              <Input
                type="search"
                value={searchValue ?? ''}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search records"
                className="min-w-56"
              />
            )}
            <Button type="button" variant="outline" size="sm" title="Filters">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>
            {actions}
          </div>
        </div>
      )}
      <div className="max-h-[640px] overflow-auto">
        <table className="enterprise-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn({
                    'text-left': !column.align || column.align === 'left',
                    'text-center': column.align === 'center',
                    'text-right': column.align === 'right',
                  })}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-sm text-[color:var(--app-text-muted)]">
                  {emptyState ?? (
                    <span className="inline-flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      No records found
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)} className="transition-premium hover:bg-[color:var(--app-surface-secondary)]">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('text-sm text-[color:var(--app-text)]', {
                        'text-left': !column.align || column.align === 'left',
                        'text-center': column.align === 'center',
                        'text-right': column.align === 'right',
                      })}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
