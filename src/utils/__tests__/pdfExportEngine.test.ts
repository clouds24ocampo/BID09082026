import { describe, it, expect } from 'vitest';
import { generateAndDownloadThreeLayerPdf } from '../pdfExportEngine';

describe('pdfExportEngine', () => {
  it('should be defined and callable', () => {
    expect(generateAndDownloadThreeLayerPdf).toBeDefined();
    expect(typeof generateAndDownloadThreeLayerPdf).toBe('function');
  });
});
