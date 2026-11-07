import { PDFDocument, PDFPage } from 'pdf-lib';

/**
 * Page-fill layout pass for the hand-positioned pdf-lib generators.
 *
 * Generators draw with absolute coordinates, so short documents end up with a large blank band
 * between the content and the signatory footer. `createFillDoc` records every draw call per page;
 * `applyPageFill` then stretches the body zone vertically (rows, rules, spacing) so the content
 * runs down to the footer. Header and footer zones, font sizes and x-positions are never touched,
 * so nothing can overlap horizontally.
 */

type DrawMethod = 'drawText' | 'drawLine' | 'drawRectangle' | 'drawImage';
const DRAW_METHODS: ReadonlySet<string> = new Set<DrawMethod>(['drawText', 'drawLine', 'drawRectangle', 'drawImage']);

interface Op { method: DrawMethod; args: any[] }
interface Recorder { page: PDFPage; ops: Op[] }

const RECORDERS = new WeakMap<PDFDocument, Recorder[]>();

/** Body zone (points) between the header block and the footer divider, per orientation. */
const bodyZone = (width: number, height: number) =>
  width > height ? { top: 514, bottom: 112 } : { top: 838, bottom: 116 };

/** Largest vertical stretch applied to a page (keeps sparse tables from looking absurd). */
export const MAX_FILL_STRETCH = 3;
/** Content separated from the main block by more than this is treated as detached (left in place). */
const CLUSTER_GAP = 70;
const BOTTOM_PAD = 6;

/** Vertical extent [bottom, top] of a recorded draw call. */
const extent = (op: Op): [number, number] => {
  const o = op.args[0] ?? {};
  switch (op.method) {
    case 'drawText': {
      const size = op.args[1]?.size ?? 12;
      const y = op.args[1]?.y ?? 0;
      return [y - size * 0.22, y + size * 0.78];
    }
    case 'drawLine': {
      const { start, end } = o;
      return [Math.min(start.y, end.y), Math.max(start.y, end.y)];
    }
    case 'drawRectangle':
      return [o.y ?? 0, (o.y ?? 0) + (o.height ?? 0)];
    default: // drawImage: (image, opts)
      return [op.args[1]?.y ?? 0, (op.args[1]?.y ?? 0) + (op.args[1]?.height ?? 0)];
  }
};

/** Wrap addPage so every page is recorded; drawing is deferred until applyPageFill. */
export const createFillDoc = async (): Promise<PDFDocument> => {
  const doc = await PDFDocument.create();
  const recorders: Recorder[] = [];
  RECORDERS.set(doc, recorders);
  const addPage = doc.addPage.bind(doc);
  doc.addPage = ((...a: any[]) => {
    const page: PDFPage = (addPage as any)(...a);
    const rec: Recorder = { page, ops: [] };
    recorders.push(rec);
    return new Proxy(page, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && DRAW_METHODS.has(prop)) {
          return (...args: any[]) => { rec.ops.push({ method: prop as DrawMethod, args }); };
        }
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
  }) as typeof doc.addPage;
  return doc;
};

/** Replay recorded draw calls onto the real pages, stretching each page body to the footer. */
export const applyPageFill = (doc: PDFDocument): void => {
  const recorders = RECORDERS.get(doc);
  if (!recorders) return;
  RECORDERS.delete(doc);

  for (const { page, ops } of recorders) {
    const { width, height } = page.getSize();
    const zone = bodyZone(width, height);
    const ext = ops.map(extent);

    // Body ops sit fully inside the zone; header ops sit above it, footer ops below it.
    const bodyIdx = ops.map((_, i) => i).filter((i) => ext[i][1] <= zone.top && ext[i][0] >= zone.bottom);
    const byTop = [...bodyIdx].sort((a, b) => ext[b][1] - ext[a][1]);

    let contentTop = -Infinity;
    let contentBottom = Infinity;
    const cluster = new Set<number>();
    for (const i of byTop) {
      if (cluster.size && ext[i][1] < contentBottom - CLUSTER_GAP) break;
      cluster.add(i);
      contentTop = Math.max(contentTop, ext[i][1]);
      contentBottom = Math.min(contentBottom, ext[i][0]);
    }

    let stretch = 1;
    if (cluster.size && contentTop > contentBottom) {
      const detachedTop = Math.max(zone.bottom, ...bodyIdx.filter((i) => !cluster.has(i)).map((i) => ext[i][1]));
      const target = detachedTop > zone.bottom ? detachedTop + 12 : zone.bottom + BOTTOM_PAD;
      stretch = Math.min(MAX_FILL_STRETCH, Math.max(1, (contentTop - target) / (contentTop - contentBottom)));
    }
    const mapY = (y: number) => contentTop - (contentTop - y) * stretch;

    ops.forEach((op, i) => {
      if (stretch === 1 || !cluster.has(i)) { (page as any)[op.method](...op.args); return; }
      const [a0, a1] = op.args;
      switch (op.method) {
        case 'drawText':
          (page as any).drawText(a0, { ...a1, y: mapY(a1.y) });
          break;
        case 'drawLine':
          page.drawLine({ ...a0, start: { ...a0.start, y: mapY(a0.start.y) }, end: { ...a0.end, y: mapY(a0.end.y) } });
          break;
        case 'drawRectangle': {
          const top = mapY(a0.y + a0.height);
          const bottom = mapY(a0.y);
          page.drawRectangle({ ...a0, y: bottom, height: top - bottom });
          break;
        }
        default: // drawImage keeps its size; anchor its top edge
          page.drawImage(a0, { ...a1, y: mapY(a1.y + a1.height) - a1.height });
      }
    });
  }
};
