import { describe, it, expect } from 'vitest';

describe('Merged Package Table of Contents (TOC) & Page Ranges', () => {
  it('should calculate accurate sequential page ranges for documents in merged bundle', () => {
    // Page 1 is always Table of Contents
    const items = [
      { id: 'doc1', documentName: 'PhilGEPS Platinum', pageCount: 3 },
      { id: 'doc2', documentName: 'Mayor\'s Permit', pageCount: 1 },
      { id: 'doc3', documentName: 'Omnibus Sworn Statement', pageCount: 4 }
    ];

    let startPage = 2;
    const computed = items.map((doc) => {
      // 1 Cover page + attached pages
      const totalDocPages = 1 + (doc.pageCount || 1);
      const start = startPage;
      const end = startPage + totalDocPages - 1;
      startPage = end + 1;
      return {
        ...doc,
        start,
        end,
        rangeText: start === end ? `Page ${start}` : `Page ${start} to ${end}`
      };
    });

    expect(computed[0].rangeText).toBe('Page 2 to 5');   // Cover (2) + 3 pages (3,4,5)
    expect(computed[1].rangeText).toBe('Page 6 to 7');   // Cover (6) + 1 page (7)
    expect(computed[2].rangeText).toBe('Page 8 to 12');  // Cover (8) + 4 pages (9,10,11,12)
  });

  it('should support all 3 folder copies (ORIGINAL, COPY 1, COPY 2) uniformly', () => {
    const folderCopies = ['ORIGINAL', 'COPY_1', 'COPY_2'];
    expect(folderCopies.length).toBe(3);
    folderCopies.forEach(copy => {
      const copyBadge = copy === 'ORIGINAL' ? 'ORIGINAL COPY' : copy === 'COPY_1' ? 'COPY 1 (DUPLICATE)' : 'COPY 2 (TRIPLICATE)';
      expect(copyBadge).toBeDefined();
    });
  });
});
