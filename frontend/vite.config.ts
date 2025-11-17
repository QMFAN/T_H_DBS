/// <reference types="node" />

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 3006,
    host: true,
    cors: true,
  },
  preview: {
    port: 3006,
    host: true,
    strictPort: true,
    allowedHosts: ['evian.zkenhealth.com', '192.168.1.231', 'localhost'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/types/**'],
    },
  },
});
