'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  glow?: boolean;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  icon: Icon,
  variant = 'default',
  glow = false,
}: MetricCardProps) {
  const variantStyles = {
    default: {
      border: 'border-[#1e1e2e]',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      valueColor: 'text-white',
    },
    success: {
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      valueColor: 'text-emerald-400',
    },
    warning: {
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      valueColor: 'text-amber-400',
    },
    danger: {
      border: 'border-rose-500/30',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      valueColor: 'text-rose-400',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-[#111118] p-5 border transition-all duration-300 hover:bg-[#151520] group',
        style.border,
        glow && 'shadow-[0_0_20px_-3px_rgba(99,102,241,0.25)] border-indigo-500/40'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300 transition-colors">
          {label}
        </span>
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center border', style.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={cn('text-2xl sm:text-3xl font-bold font-mono tracking-tight', style.valueColor)}>
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-zinc-500 font-mono">
            {subValue}
          </span>
        )}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'font-medium',
              trend.direction === 'up' && variant === 'danger' ? 'text-rose-400' : '',
              trend.direction === 'down' && variant === 'danger' ? 'text-emerald-400' : '',
              trend.direction === 'up' && variant !== 'danger' ? 'text-emerald-400' : '',
              trend.direction === 'neutral' ? 'text-zinc-400' : ''
            )}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '•'} {trend.text}
          </span>
          <span className="text-zinc-500">vs last hour</span>
        </div>
      )}
    </div>
  );
}

