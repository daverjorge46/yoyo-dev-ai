/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Yoyo AI brand colors (cyan/teal theme)
        primary: {
          DEFAULT: '#0891b2',
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          dark: '#0e7490',
          light: '#22d3ee',
        },
        accent: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          dark: '#d97706',
          light: '#fbbf24',
        },
        // Terminal theme for dark mode
        terminal: {
          bg: '#1a1b26',
          card: '#24283b',
          elevated: '#2f3549',
          surface: '#363b4f',
          border: '#414868',
          'border-emphasis': '#565f89',
          text: '#c0caf5',
          'text-secondary': '#9aa5ce',
          'text-muted': '#565f89',
          cyan: '#7dcfff',
          blue: '#7aa2f7',
          green: '#9ece6a',
          yellow: '#e0af68',
          red: '#f7768e',
          purple: '#bb9af7',
        },
        // Semantic colors
        success: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'gradient-accent': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-accent': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
      transitionDuration: {
        fast: '150ms',
        slow: '500ms',
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
