/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Terminal-inspired color palette - Claude Code CLI style
      colors: {
        // Brand colors (Anthropic Orange accent)
        brand: {
          light: '#ff8c42',
          DEFAULT: '#e85d04',
          dark: '#d45500',
        },
        // Semantic colors
        success: {
          light: '#4ade80',
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        warning: {
          light: '#fbbf24',
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
        error: {
          light: '#f87171',
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
        info: {
          light: '#60a5fa',
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
        // Terminal-specific colors (Claude Code inspired)
        terminal: {
          // Backgrounds
          black: '#0d1117',
          bg: '#0d1117',
          card: '#161b22',
          elevated: '#21262d',
          surface: '#30363d',
          // Borders
          border: '#30363d',
          'border-subtle': '#21262d',
          'border-emphasis': '#484f58',
          // Text
          text: '#e6edf3',
          'text-secondary': '#8b949e',
          'text-muted': '#6e7681',
          // ANSI-inspired colors (more vibrant)
          green: '#3fb950',
          yellow: '#d29922',
          red: '#f85149',
          blue: '#58a6ff',
          cyan: '#39c5cf',
          magenta: '#bc8cff',
          orange: '#f0883e',
          purple: '#a371f7',
          pink: '#ff7b72',
        },
        // Surface colors for light/dark mode
        surface: {
          bg: {
            light: '#f6f8fa',
            dark: '#0d1117',
          },
          card: {
            light: '#ffffff',
            dark: '#161b22',
          },
          elevated: {
            light: '#f6f8fa',
            dark: '#21262d',
          },
        },
      },
      // Monospace font family
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'SF Mono',
          'Consolas',
          'Liberation Mono',
          'Menlo',
          'monospace',
        ],
        sans: [
          'JetBrains Mono',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      // Terminal-sized typography
      fontSize: {
        'xs': ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'sm': ['13px', { lineHeight: '20px', letterSpacing: '0.01em' }],
        'base': ['14px', { lineHeight: '22px', letterSpacing: '0.01em' }],
        'lg': ['16px', { lineHeight: '24px', letterSpacing: '0' }],
        'xl': ['18px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        '2xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        '3xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '4xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
      },
      // Tighter border radius for terminal feel
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
      },
      // Dark shadows for terminal depth
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        DEFAULT: '0 2px 4px 0 rgb(0 0 0 / 0.4)',
        'md': '0 4px 8px -1px rgb(0 0 0 / 0.5)',
        'lg': '0 8px 16px -2px rgb(0 0 0 / 0.6)',
        'glow-brand': '0 0 12px -2px rgb(245 158 11 / 0.5)',
        'glow-success': '0 0 12px -2px rgb(34 197 94 / 0.5)',
        'glow-error': '0 0 12px -2px rgb(239 68 68 / 0.5)',
        'glow-info': '0 0 12px -2px rgb(59 130 246 / 0.5)',
      },
      // Fast animations for snappy feel
      transitionDuration: {
        'instant': '50ms',
        'fast': '100ms',
        DEFAULT: '150ms',
        'slow': '200ms',
      },
      // Terminal-style keyframes
      keyframes: {
        'cursor-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        'terminal-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgb(245 158 11 / 0.3)' },
          '50%': { boxShadow: '0 0 8px rgb(245 158 11 / 0.6)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'terminal-glow': 'terminal-glow 2s ease-in-out infinite',
        'scan-line': 'scan-line 8s linear infinite',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 150ms ease-out',
        'slide-down': 'slide-down 150ms ease-out',
      },
    },
  },
  plugins: [],
};
