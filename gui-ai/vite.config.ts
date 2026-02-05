import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    host: '0.0.0.0', // Allow network access
    proxy: {
      '/api': {
        target: 'http://localhost:3457',
        changeOrigin: true,
      },
    },
  },
});
