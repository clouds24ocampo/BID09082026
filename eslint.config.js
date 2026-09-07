import { defineConfig } from 'eslint/config';
import bidocsPdfPlugin from './eslint-plugin-bidocs-pdf/index.js';

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.agents/**',
      '.agent/**',
      '.claude/**',
      '.husky/**',
      'eslint-plugin-bidocs-pdf/**',
      '*.config.js',
    ],
  },
  {
    files: [
      'src/utils/pdfExportEngine.ts',
      'src/components/vault/MergedPackageViewerModal.tsx',
      'src/components/vault/MergedPdfViewerModal.tsx',
      'src/components/vault/PdfPreviewModal.tsx',
      'src/components/vault/DocumentCoverPage.tsx',
    ],
    plugins: {
      'bidocs-pdf': bidocsPdfPlugin,
    },
    rules: {
      // ── BiDOCS PDF System Guard Rules ─────────────────────────────────────
      // These prevent the exact bugs that broke the PDF system in Sept 2026.
      // DO NOT DISABLE. DO NOT DOWNGRADE TO 'warn'. These are 'error' for a reason.
      'bidocs-pdf/no-blob-url-in-data-url-fn': 'error',
      'bidocs-pdf/no-inner-legal-dimension-redeclaration': 'error',
      'bidocs-pdf/no-progress-pre-jump': 'error',
      'bidocs-pdf/no-broad-print-sheet-queryselector': 'error',
      'bidocs-pdf/no-overflow-hidden-offscreen-container': 'error',
    },
  },
]);
