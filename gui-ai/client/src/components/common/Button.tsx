import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-terminal-bg disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-gradient-primary text-white hover:shadow-glow-primary focus:ring-primary-500',
    secondary: 'bg-terminal-elevated text-terminal-text border border-terminal-border hover:bg-terminal-surface hover:border-terminal-border-emphasis focus:ring-terminal-border-emphasis',
    ghost: 'bg-transparent text-terminal-text-secondary hover:bg-terminal-elevated hover:text-terminal-text focus:ring-terminal-border',
    danger: 'bg-error text-white hover:bg-error-dark hover:shadow-glow-error focus:ring-error',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
