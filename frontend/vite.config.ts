import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiProxy = { '/api/': 'http://127.0.0.1:8899' };

export default defineConfig(({ mode }) => ({
  define: {
    __COURSE_API_BASE__: JSON.stringify(mode === 'offline' ? '' :
      loadEnv(mode, __dirname, 'VITE_API_BASE').VITE_API_BASE?.trim() ||
      loadEnv(mode, path.resolve(__dirname, '..'), 'VITE_API_BASE').VITE_API_BASE?.trim() || '',
    ),
    __KAKAO_MAP_JS_KEY__: JSON.stringify(mode === 'offline' ? '' :
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
    sourcemap: mode === 'development',
    rollupOptions: {
      input: mode === 'offline'
        ? path.resolve(__dirname, 'elice-final.html')
        : [path.resolve(__dirname, 'index.html'), path.resolve(__dirname, 'elice-final.html')],
      output: mode === 'offline' ? { inlineDynamicImports: true } : undefined,
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
