import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import * as gen from '../systemDocumentPdfGenerator';

/**
 * Renders every system-generated PDF and measures how much of each page is used.
 * Fails when any page is unused or contains a large fully blank horizontal band.
 * Set PDF_WS_REPORT=1 to print a per-document report, PDF_WS_DUMP=<dir> to write page PNGs.
 */
const require_ = createRequire(import.meta.url);

const ctx = {
  vaultDocs: [],
  projectTitle: 'Test Project',
  projectRefNo: 'REF-1',
  procuringEntity: 'Test Entity',
  activeProject: { id: 'p1', title: 'Test Project', refNo: 'REF-1', procuringEntity: 'Test Entity' },
  tenant: {
    id: 't1', companyName: 'Test Co', brandCode: 'TC', brandColor: '#0f3580', tin: '000', secDtiRegNo: 'SEC',
    philgepsPlatinumNo: 'P', address: 'Addr', preferredRegime: 'RA_9184', primaryProcurementType: 'GOODS',
    createdAt: '2026-01-01', authorizedSignatory: { name: 'Signer', title: 'President', tin: '1' },
  },
} as any;

/** Longest tolerated fully blank horizontal band, as a fraction of page height. */
const MAX_BLANK_BAND = 0.25;

interface PageStat { page: number; of: number; maxGap: number; ink: number }

async function measure(dataUri: string, dumpPrefix?: string): Promise<PageStat[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = require_('@napi-rs/canvas');
  const data = Uint8Array.from(atob(dataUri.split(',')[1]), (c) => c.charCodeAt(0));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const out: PageStat[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 0.5 });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: g as any, viewport: vp, canvas: canvas as any }).promise;
    if (dumpPrefix) (await import('fs')).writeFileSync(`${dumpPrefix}-p${n}.png`, canvas.toBuffer('image/png'));
    const { data: px, width, height } = g.getImageData(0, 0, canvas.width, canvas.height);
    // Longest run of fully blank rows (page frame lines/side borders ignored by using the inner 80% of the width).
    let run = 0;
    let maxRun = 0;
    let ink = 0;
    for (let y = 0; y < height; y++) {
      let rowInk = 0;
      for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x++) {
        const i = (y * width + x) * 4;
        if (px[i] < 245 || px[i + 1] < 245 || px[i + 2] < 245) rowInk++;
      }
      ink += rowInk;
      // a frame/rule line is a single thin row: it does not count as content
      if (rowInk === 0) { run++; maxRun = Math.max(maxRun, run); } else run = 0;
    }
    out.push({ page: n, of: doc.numPages, maxGap: maxRun / height, ink: ink / (width * height) });
  }
  return out;
}

describe('pdf whitespace', () => {
  const generators = Object.entries(gen).filter(
    ([name, fn]) => name.startsWith('generate') && name.endsWith('Pdf') && typeof fn === 'function' && (fn as Function).length <= 1,
  );

  for (const [name, fn] of generators) {
    it(`${name}: pages are filled`, async () => {
      const uri: string = await (fn as any)(ctx);
      const stats = await measure(uri, process.env.PDF_WS_DUMP ? `${process.env.PDF_WS_DUMP}/${name}` : undefined);
      if (process.env.PDF_WS_REPORT) {
        console.log(`WS ${name} ${stats.map((s) => `${s.page}/${s.of}:gap=${(s.maxGap * 100).toFixed(0)}%`).join(' ')}`);
      }
      for (const s of stats) {
        expect(s.ink, `${name} page ${s.page} is blank`).toBeGreaterThan(0);
        expect(s.maxGap, `${name} page ${s.page}/${s.of} has a ${(s.maxGap * 100).toFixed(0)}% blank band`).toBeLessThanOrEqual(MAX_BLANK_BAND);
      }
    }, 60_000);
  }
});
