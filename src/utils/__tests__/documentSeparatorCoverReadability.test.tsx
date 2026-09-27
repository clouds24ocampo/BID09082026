import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DocumentSeparatorCover } from '../../components/covers/DocumentSeparatorCover';
import { DocumentCoverPage } from '../../components/vault/DocumentCoverPage';

describe('Document Separator Sheet Font Sizing & Readability', () => {
  const mockTenant = {
    id: 'tenant-quantum',
    companyName: 'Quantum Cloud Corporation',
    brandCode: 'QUANTUM',
    brandColor: '#1e40af',
    tin: '009-881-223-000',
    address: 'Los Baños, Laguna',
    philgepsPlatinumNo: '202106-237062-883905538',
    authorizedSignatory: {
      name: 'MARK-VIN F. OCAMPO',
      title: 'President & Authorized Managing Officer',
      email: 'mark@quantum.ph',
      phone: '+63 917 123 4567',
    },
  } as any;

  const mockItem = {
    documentName: 'PhilGEPS Certificate of Registration and Membership (Platinum)',
    category: 'LEGAL' as any,
    projectTitle: 'NEGO-PROCUREMENT OF CENTRALIZED LEGISLATIVE AND ADMINISTRATIVE MANAGEMENT AND TRACKING SYSTEM FOR SANGGUNIANG BAYAN, LOS BANOS, LAGUNA',
    philgepsRefNo: 'PhilGEPS-13205295',
    procuringEntity: 'MUNICIPALITY OF LOS BAÑOS, LAGUNA',
    approvedBudget: '4, 438, 000. 00',
    submissionDeadline: 'September 30, 2026 at 1:00 PM',
  };

  it('renders DocumentSeparatorCover with 15% larger fonts and clean readable formatting', () => {
    const html = renderToString(
      <DocumentSeparatorCover
        item={mockItem}
        tenant={mockTenant}
        folderCopy="ORIGINAL"
        envelopeName="ENVELOPE 1: TECHNICAL & ELIGIBILITY COMPONENT"
      />
    );

    // 1. Check clean sanitized currency without awkward spacing
    expect(html).toContain('₱4,438,000.00');
    expect(html).not.toContain('₱4, 438, 000. 00');

    // 2. Check PhilGEPS reference number and Platinum number readability
    expect(html).toContain('PhilGEPS-13205295');
    expect(html).toContain('202106-237062-883905538');

    // 3. Verify font-sans with tabular-nums is used for readable numbers instead of font-mono
    expect(html).toContain('tabular-nums');

    // 4. Verify 15% larger font size tokens in title, envelope, and metadata blocks
    expect(html).toContain('text-[28px]');
    expect(html).toContain('md:text-[39px]');
    expect(html).toContain('text-[14px]');
    expect(html).toContain('sm:text-[15px]');
  });

  it('renders DocumentCoverPage identically with 15% larger fonts and clean numbers', () => {
    const html = renderToString(
      <DocumentCoverPage
        item={mockItem}
        tenant={mockTenant}
        folderCopy="ORIGINAL"
        envelopeName="ENVELOPE 1: TECHNICAL & ELIGIBILITY COMPONENT"
      />
    );

    expect(html).toContain('₱4,438,000.00');
    expect(html).toContain('PhilGEPS-13205295');
    expect(html).toContain('202106-237062-883905538');
    expect(html).toContain('tabular-nums');
    expect(html).toContain('text-[28px]');
    expect(html).toContain('md:text-[39px]');
  });

  it('formats numeric approvedBudget properly into en-US currency format', () => {
    const html = renderToString(
      <DocumentSeparatorCover
        item={{ ...mockItem, approvedBudget: 4438000 }}
        tenant={mockTenant}
      />
    );

    expect(html).toContain('₱4,438,000.00');
  });
});
