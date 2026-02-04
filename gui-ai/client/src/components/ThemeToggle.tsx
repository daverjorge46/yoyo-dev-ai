/**
 * ThemeToggle Component
 *
 * A toggle button for switching between light and dark mode.
 * Persists preference to localStorage and respects system preference.
 */

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function getStoredTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('yoyo-ai-theme') as ThemeMode | null;
    return stored || 'dark'; // Default to dark for terminal feel
  }
  return 'dark';
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const effectiveTheme = mode === 'system' ? getSystemTheme() : mode;

  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('yoyo-ai-theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((current) => {
      if (current === 'dark') return 'light';
      if (current === 'light') return 'system';
      return 'dark';
    });
  };

  return { theme, setTheme, toggleTheme };
}

export interface ThemeToggleProps {
  /** Current theme mode */
  theme: ThemeMode;
  /** Handler for theme changes */
  onThemeChange: (theme: ThemeMode) => void;
  /** Show dropdown with all options instead of toggle */
  showDropdown?: boolean;
  /** Additional class names */
  className?: string;
}

export function ThemeToggle({
  theme,
  onThemeChange,
  showDropdown = false,
  className = '',
}: ThemeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  const cycleTheme = () => {
    if (theme === 'dark') onThemeChange('light');
    else if (theme === 'light') onThemeChange('system');
    else onThemeChange('dark');
  };

  if (!showDropdown) {
    return (
      <button
        onClick={cycleTheme}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-md
          text-sm font-medium transition-all duration-150
          bg-gray-100 dark:bg-terminal-elevated
          text-gray-700 dark:text-terminal-text-secondary
          hover:bg-gray-200 dark:hover:bg-terminal-surface
          border border-gray-200 dark:border-terminal-border
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          dark:focus:ring-offset-terminal-bg
          ${className}
        `}
        title={`Current: ${getLabel()}. Click to change.`}
        aria-label={`Theme: ${getLabel()}. Click to cycle between themes.`}
      >
        {getIcon()}
        <span className="hidden sm:inline">{getLabel()}</span>
      </button>
    );
  }

  // Dropdown version
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-md
          text-sm font-medium transition-all duration-150
          bg-gray-100 dark:bg-terminal-elevated
          text-gray-700 dark:text-terminal-text-secondary
          hover:bg-gray-200 dark:hover:bg-terminal-surface
          border border-gray-200 dark:border-terminal-border
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          dark:focus:ring-offset-terminal-bg
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {getIcon()}
        <span className="hidden sm:inline">{getLabel()}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="
              absolute right-0 mt-2 w-40 z-50
              bg-white dark:bg-terminal-card
              border border-gray-200 dark:border-terminal-border
              rounded-md shadow-lg overflow-hidden
              animate-slide-down
            "
            role="menu"
          >
            {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  onThemeChange(mode);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-sm text-left
                  transition-colors
                  ${
                    theme === mode
                      ? 'bg-primary/10 text-primary dark:bg-terminal-orange/10 dark:text-terminal-orange'
                      : 'text-gray-700 dark:text-terminal-text-secondary hover:bg-gray-50 dark:hover:bg-terminal-elevated'
                  }
                `}
                role="menuitem"
              >
                {mode === 'dark' && <Moon className="h-4 w-4" />}
                {mode === 'light' && <Sun className="h-4 w-4" />}
                {mode === 'system' && <Monitor className="h-4 w-4" />}
                <span className="capitalize">{mode}</span>
                {theme === mode && (
                  <svg className="h-4 w-4 ml-auto text-primary dark:text-terminal-orange" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
