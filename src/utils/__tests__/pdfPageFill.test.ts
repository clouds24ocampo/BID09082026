import { describe, it, expect } from 'vitest';
import { StandardFonts, rgb, PDFDocument } from 'pdf-lib';
import { createFillDoc, applyPageFill, MAX_FILL_STRETCH } from '../pdfPageFill';

/** y-position of each drawn text, keyed by its string. */
async function textYs(doc: PDFDocument): Promise<Record<string, number>> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loaded = await pdfjs.getDocument({ data: await doc.save() }).promise;
  const content = await (await loaded.getPage(1)).getTextContent();
  const out: Record<string, number> = {};
  for (const item of content.items as any[]) if (item.str) out[item.str] = item.transform[5];
  return out;
}

async function sparsePortrait(extra?: (draw: (t: string, y: number) => void) => void) {
  const doc = await createFillDoc();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 936]);
  const draw = (t: string, y: number) => page.drawText(t, { x: 40, y, size: 8, font, color: rgb(0, 0, 0) });
  draw('HEADER', 900); // header zone
  draw('ROW1', 800);
  draw('ROW2', 780);
  draw('FOOTER', 60); // footer zone
  extra?.(draw);
  applyPageFill(doc);
  return doc;
}

describe('applyPageFill', () => {
  it('stretches the body toward the footer and leaves header/footer where they were', async () => {
    const y = await textYs(await sparsePortrait());
    expect(y.HEADER).toBeCloseTo(900, 1);
    expect(y.FOOTER).toBeCloseTo(60, 1);
    expect(y.ROW1).toBeLessThanOrEqual(800); // top edge anchored (baseline shifts by at most the text height)
    expect(800 - y.ROW1).toBeLessThan(6.3 * MAX_FILL_STRETCH);
    expect(y.ROW2).toBeLessThan(780); // spread downward
    expect(y.ROW1 - y.ROW2).toBeLessThanOrEqual(20 * MAX_FILL_STRETCH + 0.5); // row spacing never beyond the stretch cap
  });

  it('keeps a full page inside the body zone and nearly unchanged', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => 800 - i * 56); // contiguous down to y=184
    const doc = await createFillDoc();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([612, 936]);
    rows.forEach((y, i) => page.drawText(`R${i}`, { x: 40, y, size: 8, font }));
    applyPageFill(doc);
    const y = await textYs(doc);
    const last = y.R11;
    expect(last).toBeGreaterThanOrEqual(116); // never pushed into the footer
    expect(last).toBeLessThanOrEqual(184); // and only moves downward
  });

  it('keeps a detached note in place and fills only down to it', async () => {
    const y = await textYs(await sparsePortrait((draw) => draw('NOTE', 130)));
    expect(y.NOTE).toBeCloseTo(130, 1);
    expect(y.ROW2).toBeGreaterThan(130 + 8); // stretched content stops above the note
  });

  it('leaves documents that were not created with createFillDoc untouched', () => {
    expect(() => applyPageFill({} as PDFDocument)).not.toThrow();
  });
});
