import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_BACKEND_ORIGIN || 'http://localhost:8000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      // Mismo origen para API y WebSocket: la cookie httpOnly del refresh viaja sin CORS
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/ws': { target: backend, changeOrigin: true, ws: true },
      },
    },
  };
});
