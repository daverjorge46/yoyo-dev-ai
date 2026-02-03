import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'muted';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'muted', children, className = '' }: BadgeProps) {
  const variantClasses = {
    primary: 'bg-primary-500/20 text-primary-400',
    accent: 'bg-accent-500/20 text-accent-400',
    success: 'bg-success/20 text-success-light',
    warning: 'bg-warning/20 text-warning-light',
    error: 'bg-error/20 text-error-light',
    info: 'bg-info/20 text-info-light',
    muted: 'bg-terminal-elevated text-terminal-text-secondary',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
