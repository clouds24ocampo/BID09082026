import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFRawStream, PDFArray, PDFRef, decodePDFRawStream } from 'pdf-lib';
import * as gen from '../systemDocumentPdfGenerator';
import { buildMergedThreeLayerPdfBytes } from '../pdfExportEngine';

// Size of the decoded content stream of a page: 0 means the page draws nothing (blank page).
const contentSize = (doc: PDFDocument, pageIndex: number): number => {
  const page = doc.getPage(pageIndex);
  const contents = page.node.Contents();
  if (!contents) return 0;
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  let total = 0;
  for (const r of refs) {
    const obj = r instanceof PDFRef ? doc.context.lookup(r) : r;
    if (obj instanceof PDFRawStream) total += decodePDFRawStream(obj).decode().length;
  }
  return total;
};

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

describe('no blank pages', () => {
  const generators = Object.entries(gen).filter(
    ([name, fn]) => name.startsWith('generate') && name.endsWith('Pdf') && typeof fn === 'function' && (fn as Function).length <= 1,
  );

  for (const [name, fn] of generators) {
    it(`${name}: every page draws content`, async () => {
      const uri: string = await (fn as any)(ctx);
      const bytes = Uint8Array.from(atob(uri.split(',')[1]), (c) => c.charCodeAt(0));
      const doc = await PDFDocument.load(bytes);
      for (let i = 0; i < doc.getPageCount(); i++) {
        expect(contentSize(doc, i), `${name} page ${i + 1} is blank`).toBeGreaterThan(0);
      }
    });
  }

  it('merged bundle never contains a zero-content page', async () => {
    const src = await PDFDocument.create();
    src.addPage([612, 936]).drawText('content', { x: 50, y: 800 });
    const bytes = await buildMergedThreeLayerPdfBytes(
      [{ title: 'A', fileSource: await src.save() }, { title: 'B', fileSource: await src.save() }],
      'x.pdf', undefined, { folderCopy: 'ORIGINAL' },
    );
    const doc = await PDFDocument.load(bytes);
    for (let i = 0; i < doc.getPageCount(); i++) expect(contentSize(doc, i)).toBeGreaterThan(0);
  });
});
