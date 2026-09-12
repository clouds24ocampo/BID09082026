import { describe, it, expect } from 'vitest';
import { autoFitPageChunks, calculateRowHeight, getAutoFitTypographyClass } from '../autoFitEngine';

describe('Auto-Fit Page Packing Engine', () => {
  it('should calculate accurate row heights with natural word wrapping slack', () => {
    const text = 'RJ 45 10 M 100 M 1000 M self-adaptive Ethernet port RS-4851 RS-485 (Half duplex, HIKVISION, Pelco-P, Pelco\n' +
      'D) General Power 12 VDC ± 20% or PoE (802.3at, Class 4) Consumption Max. 18 WProtection IP 67 (Weather), IK 10\n' +
      '(Vandal), NEMA 4 X (Anti-Corrosion) Operating Temp-40 °C to 65 °C (-40 °F to 149 °F) Weight Approx. 1920 g (4.23 lb.)';
    
    // In 52 chars/line, 16.5px lineHeight, 16px base padding
    const height = calculateRowHeight(text, 52, 16.5, 16, 28);
    expect(height).toBeGreaterThan(120); // Accurate multi-line height prevents underestimation
  });

  it('should pack single page documents without extra pages when items fit within singlePageCapacity', () => {
    const items = [
      { id: 1, title: 'Item 1', desc: 'Short description' },
      { id: 2, title: 'Item 2', desc: 'Short description 2' },
    ];
    const pages = autoFitPageChunks(
      items,
      () => 50,
      {
        orientation: 'portrait',
        headerHeightPx: 170,
        footerHeightPx: 260,
        runningFooterPx: 42,
        continuationTheadHeightPx: 0,
        safetyBufferPx: 45
      }
    );

    expect(pages.length).toBe(1);
    expect(pages[0].length).toBe(2);
  });

  it('should support continuationTheadHeightPx = 0 for Section VII continuation pages', () => {
    // 15 items of 100px each
    const items = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `Spec Item ${i + 1}` }));
    const pages = autoFitPageChunks(
      items,
      () => 100,
      {
        orientation: 'portrait',
        headerHeightPx: 170,
        footerHeightPx: 260,
        runningFooterPx: 42,
        continuationTheadHeightPx: 0, // No thead on continuation pages
        safetyBufferPx: 45
      }
    );

    expect(pages.length).toBeGreaterThan(1);
    // Total items across all pages must equal 15
    const totalPacked = pages.reduce((sum, p) => sum + p.length, 0);
    expect(totalPacked).toBe(15);
  });

  it('never forces the last item onto a page if it would overflow the signatory block', () => {
    // Page 1 capacity: ~910px
    // Continuation capacity: ~1115px
    // Final page continuation capacity: ~875px (reserving 240px for signatory block)
    // Create items such that if the last item were placed on page 2, page 2 would exceed finalCapacity
    const items = [
      ...Array.from({ length: 7 }, (_, i) => ({ id: i + 1, height: 120 })), // 840px on page 1
      { id: 8, height: 120 }, // starts page 2
      { id: 9, height: 120 },
      { id: 10, height: 120 },
      { id: 11, height: 120 },
      { id: 12, height: 120 },
      { id: 13, height: 120 },
      { id: 14, height: 150 }, // Total on page 2 would be 870px + 150px = 1020px (exceeds finalCapacity ~855px)
    ];

    const pages = autoFitPageChunks(
      items,
      (it) => it.height,
      {
        orientation: 'portrait',
        headerHeightPx: 170,
        footerHeightPx: 260,
        runningFooterPx: 42,
        continuationTheadHeightPx: 0,
        safetyBufferPx: 45
      }
    );

    // Item 14 must not cause the final page to overflow its signatory capacity
    const lastPage = pages[pages.length - 1];
    const lastPageContentHeight = lastPage.reduce((sum, it) => sum + it.height, 0);
    // Usable height: 1200 - 260 (footer) - 42 (runningFooter) - 45 (buffer) = 853px
    expect(lastPageContentHeight).toBeLessThanOrEqual(860);
  });

  it('automatically balances items into minimum pages without big empty spaces', () => {
    // 11 items of 80px each (880px total)
    // In old greedy engine: Page 1 took 8 items and Page 2 took 3 items (leaving Page 2 70% empty)
    // In new balanced engine: Page 1 gets 6 items and Page 2 gets 5 items, perfectly balanced!
    const items = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, height: 80 }));
    const pages = autoFitPageChunks(
      items,
      (it) => it.height,
      {
        orientation: 'portrait',
        headerHeightPx: 170,
        footerHeightPx: 220,
        runningFooterPx: 40,
        continuationTheadHeightPx: 0,
        safetyBufferPx: 45
      }
    );

    expect(pages.length).toBe(2); // Exactly 2 pages! Not 3 or 4!
    expect(pages[0].length).toBe(6);
    expect(pages[1].length).toBe(5);
  });

  it('selects appropriate typography classes according to total character volume', () => {
    expect(getAutoFitTypographyClass(6000, 20)).toBe('text-[9.5px] leading-snug');
    expect(getAutoFitTypographyClass(3000, 12)).toBe('text-[10px] leading-snug');
    expect(getAutoFitTypographyClass(500, 3)).toBe('text-[10.5px] leading-normal');
  });
});
