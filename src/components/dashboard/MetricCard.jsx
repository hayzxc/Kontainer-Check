import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function MetricCard({ title, value, icon: Icon, trend, trendLabel, variant = 'default' }) {
  const variants = {
    default: 'surface-panel',
    primary: 'border-transparent bg-[linear-gradient(180deg,hsl(210_48%_23%),hsl(210_56%_19%))] text-primary-foreground shadow-[0_18px_34px_hsl(210_56%_24%_/_0.18)]',
    accent: 'surface-panel border-accent/20 bg-accent/6',
  };

  return (
    <Card className={cn(
      'group relative overflow-hidden p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_hsl(210_56%_24%_/_0.10)]',
      variants[variant]
    )}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.12em]',
            variant === 'primary' ? 'text-primary-foreground/72' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className={cn(
            'data-value text-3xl font-bold tracking-tight',
            variant === 'primary' && 'text-primary-foreground'
          )}>
            {value}
          </p>
          {trendLabel && (
            <p className={cn(
              'text-xs font-medium',
              trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'rounded-2xl border p-2.5 transition-transform duration-200 group-hover:scale-105',
            variant === 'primary' ? 'border-white/10 bg-white/10' : 'border-primary/10 bg-primary/6'
          )}>
            <Icon className={cn(
              'w-5 h-5',
              variant === 'primary' ? 'text-primary-foreground' : 'text-primary'
            )} />
          </div>
        )}
      </div>
    </Card>
  );
}
