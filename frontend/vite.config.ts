import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiProxy = { '/api/': 'http://127.0.0.1:8899' };

export default defineConfig(({ mode }) => ({
  define: {
    __KAKAO_MAP_JS_KEY__: JSON.stringify(
      loadEnv(mode, path.resolve(__dirname, '..'), 'OPENNADEULI_MAPKAKAO').OPENNADEULI_MAPKAKAO?.trim() ?? '',
    ),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    rollupOptions: {
      input: [path.resolve(__dirname, 'index.html'), path.resolve(__dirname, 'elice-final.html')],
    },
  },
  preview: {
    proxy: apiProxy,
  },
  server: {
    proxy: apiProxy,
    port: 5176,
    host: true,
    strictPort: false,
    hmr: false,
    middlewareMode: false,
  },
}));
