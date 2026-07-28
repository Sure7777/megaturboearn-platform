import { defineConfig, Plugin } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import path from 'path';
import botApp from './bot/src/index';

function honoDevPlugin(): Plugin {
  return {
    name: 'hono-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/') || url === '/webhook' || url === '/register-webhook') {
          try {
            const host = req.headers.host || 'localhost:3000';
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const fullUrl = `${protocol}://${host}${url}`;

            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
            }

            let body: any = null;
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              const buffers: Buffer[] = [];
              for await (const chunk of req) {
                buffers.push(Buffer.from(chunk));
              }
              body = Buffer.concat(buffers);
            }

            const webReq = new Request(fullUrl, {
              method: req.method,
              headers,
              body: body && body.length > 0 ? body : undefined,
            });

            const mockEnv = {
              BOT_TOKEN: process.env.BOT_TOKEN || '8546533987:AAG_M_V48Jpn7zyMPYELIH9nX5cOmMNc-p8',
              ADMIN_ID: process.env.ADMIN_ID || '6960850082',
              APP_URL: `${protocol}://${host}/app`,
            };

            const response = await botApp.fetch(webReq, mockEnv);

            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
              res.setHeader(key, value);
            });

            const responseBody = await response.arrayBuffer();
            res.end(Buffer.from(responseBody));
          } catch (err) {
            console.error('Hono dev server middleware error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error in Hono Dev Plugin' }));
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  server: { host: true, allowedHosts: true },
  plugins: [
    honoDevPlugin(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: false,
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
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            if (id.includes('framer-motion')) return 'vendor-[#framer]';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor-deps';
          }
        },
      },
    },
  },
});
