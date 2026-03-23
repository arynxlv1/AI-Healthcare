import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Glass card — dark theme
export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-6",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const Badge = ({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'urgent' | 'warning' | 'success';
  className?: string;
}) => {
  const variants = {
    default:  'bg-white/10 text-slate-300 border border-white/10',
    urgent:   'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse',
    warning:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    success:  'bg-green-500/20 text-green-400 border border-green-500/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export const MetricCard = ({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon?: any;
  accent?: string;
}) => (
  <Card className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      {Icon && (
        <div className={cn('p-2 rounded-lg', accent ?? 'bg-blue-500/10')}>
          <Icon className={cn('h-4 w-4', accent ? 'text-current' : 'text-blue-400')} />
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    {description && <p className="text-xs text-slate-500">{description}</p>}
  </Card>
);
