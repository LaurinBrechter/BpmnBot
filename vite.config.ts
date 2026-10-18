import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    env.VITE_CLERK_PUBLISHABLE_KEY;

  return {
  define: {
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkPublishableKey),
  },
  server: { allowedHosts: ['.vercel.run'] },
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
  };
});

