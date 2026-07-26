export interface OpportunityProjectOption {
  id: string;
  refNo: string;
  title: string;
  procuringEntity: string;
  abc: string;
}

export const getOpportunityProjects = (): OpportunityProjectOption[] => {
  const defaultProjects: OpportunityProjectOption[] = [
    {
      id: 'opp-1',
      refNo: 'PhilGEPS-2026-10928371',
      title: 'Construction of Multi-Purpose Evacuation Center Phase II',
      procuringEntity: 'Department of Public Works and Highways (DPWH Region IV-A)',
      abc: '₱12,500,000.00'
    },
    {
      id: 'opp-2',
      refNo: 'PRJ-2026-901283',
      title: 'Infrastructure & IT Systems Modernization Project',
      procuringEntity: 'Department of Information & Communications Technology (DICT Central)',
      abc: '₱8,900,000.00'
    },
    {
      id: 'opp-3',
      refNo: 'PhilGEPS-2026-887410',
      title: 'Supply and Delivery of Medical & Laboratory Diagnostic Equipment',
      procuringEntity: 'Department of Health (DOH Central Office)',
      abc: '₱15,000,000.00'
    },
    {
      id: 'opp-4',
      refNo: 'PRJ-2026-441092',
      title: 'Design, Supply & Commissioning of Solar Power Integration System',
      procuringEntity: 'National Power Corporation (NAPOCOR Headquarters)',
      abc: '₱6,200,000.00'
    }
  ];

  try {
    const saved = localStorage.getItem('bidocs_opportunities');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const fromStorage: OpportunityProjectOption[] = parsed.map((item: any, idx: number) => ({
          id: item.id || `opp-stg-${idx}`,
          refNo: item.projectReferenceNumber || item.philgepsRefNo || `PRJ-2026-${1000 + idx}`,
          title: item.title || item.biddingProjectTitle || 'Untitled Opportunity',
          procuringEntity: typeof item.procuringEntity === 'string'
            ? item.procuringEntity
            : item.procuringEntity?.name || item.procuringEntityName || 'Government Agency',
          abc: item.approvedBudgetStr || (item.approvedBudgetValue ? `₱${Number(item.approvedBudgetValue).toLocaleString()}` : '₱0.00')
        }));

        const combined = [...fromStorage, ...defaultProjects];
        const seen = new Set<string>();
        return combined.filter(p => {
          if (!p.refNo || seen.has(p.refNo)) return false;
          seen.add(p.refNo);
          return true;
        });
      }
    }
  } catch (e) {
    console.error('[OpportunityProjects] Error parsing storage:', e);
  }

  return defaultProjects;
};
