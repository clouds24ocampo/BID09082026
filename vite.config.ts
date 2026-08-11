import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    watch: {
      ignored: ['**/AntigravitySkills/**', '**/.agents/**']
    }
  }
});
