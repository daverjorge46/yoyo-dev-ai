/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand color - Vibrant Orange (matching yoyo-dev)
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#E85D04',  // Main primary
          600: '#d45500',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          DEFAULT: '#E85D04',
        },
        // Accent color - Warm Gold (matching yoyo-dev)
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#D29922',  // Main accent
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          DEFAULT: '#D29922',
        },
        // Legacy brand alias (for backward compatibility)
        brand: {
          light: '#fb923c',
          DEFAULT: '#E85D04',
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
          DEFAULT: '#D29922',
          dark: '#ca8a04',
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
        // Terminal-specific colors (matching yoyo-dev)
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
          yellow: '#D29922',  // Gold accent
          red: '#f85149',
          blue: '#58a6ff',
          cyan: '#39c5cf',
          magenta: '#bc8cff',
          orange: '#E85D04',  // Primary orange
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
        // Elegant glow effects with primary/accent colors
        'glow-primary': '0 0 20px -4px rgb(232 93 4 / 0.5)',
        'glow-accent': '0 0 20px -4px rgb(210 153 34 / 0.5)',
        'glow-brand': '0 0 12px -2px rgb(232 93 4 / 0.5)',
        'glow-success': '0 0 12px -2px rgb(34 197 94 / 0.5)',
        'glow-error': '0 0 12px -2px rgb(239 68 68 / 0.5)',
        'glow-info': '0 0 12px -2px rgb(59 130 246 / 0.5)',
        // Subtle inner glow for cards
        'inner-glow-primary': 'inset 0 1px 0 0 rgb(232 93 4 / 0.1)',
        'inner-glow-accent': 'inset 0 1px 0 0 rgb(210 153 34 / 0.1)',
      },
      // Background gradients
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #E85D04 0%, #D29922 100%)',
        'gradient-primary-subtle': 'linear-gradient(135deg, rgb(232 93 4 / 0.1) 0%, rgb(210 153 34 / 0.1) 100%)',
        'gradient-dark': 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)',
        'gradient-radial-primary': 'radial-gradient(ellipse at top, rgb(232 93 4 / 0.15) 0%, transparent 50%)',
        'gradient-radial-accent': 'radial-gradient(ellipse at top, rgb(210 153 34 / 0.15) 0%, transparent 50%)',
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
          '0%, 100%': { boxShadow: '0 0 4px rgb(232 93 4 / 0.3)' },
          '50%': { boxShadow: '0 0 12px rgb(232 93 4 / 0.6)' },
        },
        'accent-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgb(210 153 34 / 0.3)' },
          '50%': { boxShadow: '0 0 12px rgb(210 153 34 / 0.6)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
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
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'kaomoji-shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'terminal-glow': 'terminal-glow 2s ease-in-out infinite',
        'accent-glow': 'accent-glow 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'scan-line': 'scan-line 8s linear infinite',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 150ms ease-out',
        'slide-down': 'slide-down 150ms ease-out',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'kaomoji-shimmer': 'kaomoji-shimmer 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
