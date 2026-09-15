/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('node_modules')) {
            if (normalized.includes('pdf-lib') || normalized.includes('html2canvas') || normalized.includes('jspdf')) {
              return 'pdf-engine-vendor';
            }
            if (normalized.includes('three') || normalized.includes('@react-three')) {
              return 'three-3d-vendor';
            }
            if (normalized.includes('framer-motion')) {
              return 'motion-vendor';
            }
            if (normalized.includes('lucide-react')) {
              return 'lucide-icons';
            }
            if (normalized.includes('react/') || normalized.includes('react-dom/')) {
              return 'react-core-vendor';
            }
            return 'vendor';
          }
          if (normalized.includes('src/components/vault/templates/')) {
            return 'vault-templates';
          }
          if (normalized.includes('src/components/covers/')) {
            return 'packaging-covers';
          }
          if (
            normalized.includes('src/utils/systemDocumentPdfGenerator') ||
            normalized.includes('src/utils/vectorPdfGenerator') ||
            normalized.includes('src/utils/pdfExportEngine')
          ) {
            return 'pdf-system-engine';
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
