import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./client/src/__tests__/setup.ts'],
    include: [
      'client/src/**/*.{test,spec}.{ts,tsx}',
      'server/__tests__/**/*.{test,spec}.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['client/src/**/*.{ts,tsx}', 'server/**/*.ts'],
      exclude: [
        'client/src/**/*.{test,spec}.{ts,tsx}',
        'client/src/__tests__/**',
        'server/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
    },
  },
});
