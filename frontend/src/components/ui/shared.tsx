import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-card text-card-foreground rounded-xl border shadow-sm p-6", className)} {...props}>
    {children}
  </div>
);

export const Badge = ({ children, variant = 'default', className }: { 
  children: React.ReactNode, 
  variant?: 'default' | 'urgent' | 'warning' | 'success',
  className?: string 
}) => {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    urgent: "bg-destructive text-destructive-foreground animate-pulse",
    warning: "bg-yellow-500 text-white",
    success: "bg-green-500 text-white"
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}>
      {children}
    </span>
  );
};

export const MetricCard = ({ label, value, description, icon: Icon }: {
  label: string,
  value: string | number,
  description?: string,
  icon?: any
}) => (
  <Card className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </div>
    <p className="text-2xl font-bold">{value}</p>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
  </Card>
);
