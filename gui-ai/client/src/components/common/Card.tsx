import React from 'react';

interface CardProps {
  variant?: 'default' | 'hover' | 'interactive' | 'accent' | 'accent-gold' | 'gradient';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Card({ variant = 'default', className = '', children, onClick }: CardProps) {
  const variantClasses = {
    default: 'terminal-card',
    hover: 'terminal-card-hover',
    interactive: 'terminal-card-interactive',
    accent: 'terminal-card-accent',
    'accent-gold': 'terminal-card-accent-gold',
    gradient: 'terminal-card-gradient-top',
  };

  return (
    <div
      className={`${variantClasses[variant]} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
