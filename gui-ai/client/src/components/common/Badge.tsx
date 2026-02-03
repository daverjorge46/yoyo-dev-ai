import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'default';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variantClasses = {
    primary: 'bg-primary-500/20 text-primary-400',
    accent: 'bg-accent-500/20 text-accent-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    error: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
    muted: 'bg-terminal-elevated text-terminal-text-muted',
    default: 'bg-terminal-elevated text-terminal-text-secondary',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
