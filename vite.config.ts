import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'auto-browser-refresh-on-revision',
      handleHotUpdate({ server }) {
        // Instantly triggers automatic browser refresh on every code revision/save
        server.ws.send({
          type: 'full-reload',
          path: '*'
        });
      }
    }
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdf-lib') || id.includes('html2canvas')) {
              return 'pdf-engine-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 3001,
    strictPort: true,
    open: false,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 100,
      ignored: ['**/AntigravitySkills/**', '**/.agents/**', '**/dist/**', '**/.git/**']
    }
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/.agents/**', '**/node_modules/**', '**/dist/**']
  }
});
