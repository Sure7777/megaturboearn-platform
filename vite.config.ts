import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  server: { host: true, allowedHosts: true },
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: false, // سنعطل الزحف التلقائي لأنه يسبب الخطأ
      },
    }),
    viteReact(),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
