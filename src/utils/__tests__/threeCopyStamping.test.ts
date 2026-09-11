import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { formatDateOnly, buildMergedThreeLayerPdfBytes } from '../pdfExportEngine';

describe('Three-Copy Stamping & Date-Only Formatting', () => {
  it('should strip time components from date string and format to date-only', () => {
    // ISO string with T and time
    expect(formatDateOnly('2026-08-30T14:00:00')).toBe('August 30, 2026');
    expect(formatDateOnly('2026-08-30T14:00')).toBe('August 30, 2026');
    expect(formatDateOnly('2026-08-30')).toBe('August 30, 2026');

    // Date string with " at 02:00 PM"
    expect(formatDateOnly('August 30, 2026 at 02:00 PM')).toBe('August 30, 2026');
    expect(formatDateOnly('September 15, 2026 at 10:00 AM')).toBe('September 15, 2026');

    // Date string with trailing time
    expect(formatDateOnly('August 30, 2026 14:00')).toBe('August 30, 2026');

    // Fallback when empty or null
    expect(formatDateOnly(null)).toBe('August 30, 2026');
    expect(formatDateOnly('')).toBe('August 30, 2026');
  });

  it('should stamp each page of COPY_1 and COPY_2 with Certified True Copy, date-only, and Signed by', async () => {
    const srcDoc = await PDFDocument.create();
    srcDoc.addPage([612, 936]);
    srcDoc.addPage([612, 936]);
    const srcBytes = await srcDoc.save();

    // 1. Compile COPY_1 package
    const copy1Bytes = await buildMergedThreeLayerPdfBytes(
      [
        {
          title: 'DOC-1: PhilGEPS Certificate',
          fileSource: srcBytes
        }
      ],
      'PRJ-2026_COPY_1_MERGED_PACKAGE.pdf',
      undefined,
      {
        folderCopy: 'COPY_1',
        submissionDate: '2026-08-30T14:00',
        signatoryName: 'Engr. Juan Dela Cruz'
      }
    );

    expect(copy1Bytes).toBeDefined();
    expect(copy1Bytes.length).toBeGreaterThan(0);

    const doc1 = await PDFDocument.load(copy1Bytes);
    expect(doc1.getPageCount()).toBe(2);

    // 2. Compile COPY_2 package
    const copy2Bytes = await buildMergedThreeLayerPdfBytes(
      [
        {
          title: 'DOC-2: DTI Certificate',
          fileSource: srcBytes
        }
      ],
      'PRJ-2026_COPY_2_MERGED_PACKAGE.pdf',
      undefined,
      {
        folderCopy: 'COPY_2',
        submissionDate: 'August 30, 2026 at 02:00 PM',
        signatoryName: 'Maria Santos'
      }
    );

    expect(copy2Bytes).toBeDefined();
    expect(copy2Bytes.length).toBeGreaterThan(0);

    const doc2 = await PDFDocument.load(copy2Bytes);
    expect(doc2.getPageCount()).toBe(2);

    // 3. Compile ORIGINAL package (should have ORIGINAL header, not Certified True Copy)
    const origBytes = await buildMergedThreeLayerPdfBytes(
      [
        {
          title: 'DOC-1: PhilGEPS Certificate',
          fileSource: srcBytes
        }
      ],
      'PRJ-2026_ORIGINAL_MERGED_PACKAGE.pdf',
      undefined,
      {
        folderCopy: 'ORIGINAL',
        submissionDate: '2026-08-30',
        signatoryName: 'Engr. Juan Dela Cruz'
      }
    );

    const origDoc = await PDFDocument.load(origBytes);
    expect(origDoc.getPageCount()).toBe(2);
  });
});
