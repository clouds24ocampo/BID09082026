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
      handleHotUpdate({ server, modules, timestamp }: { server: any; modules: any[]; timestamp: number }) {
        // Instantly invalidate changed modules
        try {
          const invalidatedModules = new Set<any>();
          for (const mod of modules) {
            server.moduleGraph.invalidateModule(
              mod,
              invalidatedModules,
              timestamp,
              true
            );
          }
        } catch (_) {}

        // Send full-reload unconditionally to browser
        server.ws.send({ type: 'full-reload' });
        if ((server as any).hot) {
          try { (server as any).hot.send({ type: 'full-reload' }); } catch (_) {}
        }

        // Broadcast custom force-reload event to client
        try {
          server.ws.send({
            type: 'custom',
            event: 'bidocs:force-reload',
            data: { timestamp: Date.now() }
          });
        } catch (_) {}

        // Return empty array to bypass partial HMR and force full reload
        return [];
      }
    }
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('node_modules')) {
            if (normalized.includes('pdf-lib') || normalized.includes('html2canvas') || normalized.includes('jspdf')) {
              return 'pdf-engine-vendor';
            }
            if (normalized.includes('framer-motion')) {
              return 'motion-vendor';
            }
            if (normalized.includes('lucide-react')) {
              return 'lucide-icons';
            }
            if (normalized.includes('three')) {
              return 'three-engine-vendor';
            }
            if (normalized.includes('react/') || normalized.includes('react-dom/')) {
              return 'react-core-vendor';
            }
            return 'vendor';
          }
          if (normalized.includes('src/components/vault/templates/')) {
            if (
              normalized.includes('StatutoryDocumentsGuideModal') ||
              normalized.includes('RLA') ||
              normalized.includes('SWA') ||
              normalized.includes('CA') ||
              normalized.includes('MTS') ||
              normalized.includes('sote') ||
              normalized.includes('Bs') ||
              normalized.includes('FPL') ||
              normalized.includes('psd') ||
              normalized.includes('pert') ||
              normalized.includes('mpds') ||
              normalized.includes('toa') ||
              normalized.includes('EUP') ||
              normalized.includes('CMS') ||
              normalized.includes('ABP') ||
              normalized.includes('WS') ||
              normalized.includes('POW') ||
              normalized.includes('programofwork') ||
              normalized.includes('Progressphoto')
            ) {
              return 'statutory-templates';
            }
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
    host: true,
    port: 3001,
    strictPort: true,
    open: false,
    hmr: {
      overlay: true,
      port: 3001
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
    watch: {
      usePolling: true,
      interval: 100,
      binaryInterval: 300,
      ignored: ['**/AntigravitySkills/**', '**/.agents/**', '**/dist/**', '**/.git/**', '**/node_modules/**']
    }
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/.agents/**', '**/node_modules/**', '**/dist/**']
  }
});
