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
          dark: '#0e7490',
          light: '#22d3ee',
        },
        accent: {
          DEFAULT: '#06b6d4',
          dark: '#0891b2',
          light: '#67e8f9',
        },
        // Terminal theme for dark mode
        terminal: {
          bg: '#1a1b26',
          card: '#24283b',
          elevated: '#2f3549',
          border: '#414868',
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
      },
    },
  },
  plugins: [],
};
