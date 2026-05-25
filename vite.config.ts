import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) {
            return 'firebase';
          }
          if (id.includes('xlsx-js-style')) {
            return 'xlsx-vendor';
          }
          if (id.includes('lucide-react') || id.includes('motion')) {
            return 'ui-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
});
