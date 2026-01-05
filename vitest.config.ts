import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'gui/client/src/**/*.{test,spec}.{ts,tsx}',
      'gui/server/__tests__/**/*.{test,spec}.ts',
      'packages/**/*.{test,spec}.{ts,tsx}',
    ],
    environmentMatchGlobs: [['gui/client/**', 'jsdom']],
    setupFiles: ['gui/client/src/__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'coverage/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'gui/client/src'),
    },
  },
});
