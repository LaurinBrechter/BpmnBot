import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: { allowedHosts: ['sb-1re6kp7h0zs2.vercel.run'] },
  plugins: [react(), {
    name: 'diagram-api',
    async configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      const { default: handler } = await import('./server/handler');
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/')) void handler(req, res);
        else next();
      });
    },
  }],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  css: {
    preprocessorOptions: {},
  },
});

