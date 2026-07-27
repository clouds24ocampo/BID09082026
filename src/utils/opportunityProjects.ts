import { debugLog } from './debugLog';

export interface OpportunityProjectOption {
  id: string;
  refNo: string;
  solicitationNo: string;
  title: string;
  procuringEntity: string;
  abc: string;
  dateTimeSubmitted: string;
}

/**
 * Fetches real active bidding projects saved in Opportunity Finder (localStorage: bidocs_opportunities).
 * Scans tenant-scoped keys, un-scoped keys, and all bidocs_opportunities_* keys to ensure 100% project retrieval.
 * Strictly deduplicates projects by ID and Reference Number.
 */
export const getOpportunityProjects = (tenantId?: string): OpportunityProjectOption[] => {
  try {
    let rawItems: any[] = [];

    // 1. If tenantId is provided, load tenant-scoped opportunities strictly
    if (tenantId) {
      const savedTenant = localStorage.getItem(`bidocs_opportunities_${tenantId}`);
      if (savedTenant) {
        try {
          const parsed = JSON.parse(savedTenant);
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawItems.push(...parsed);
          }
        } catch (e) {}
      }
      // If no tenant-specific items found, check legacy key
      if (rawItems.length === 0) {
        const savedLegacy = localStorage.getItem('bidocs_opportunities');
        if (savedLegacy) {
          try {
            const parsed = JSON.parse(savedLegacy);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rawItems.push(...parsed);
            }
          } catch (e) {}
        }
      }
    } else {
      // 2. No tenantId provided: Load general legacy opportunities key
      const savedLegacy = localStorage.getItem('bidocs_opportunities');
      if (savedLegacy) {
        try {
          const parsed = JSON.parse(savedLegacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawItems.push(...parsed);
          }
        } catch (e) {}
      }

      // 3. Scan all keys starting with bidocs_opportunities only when no tenantId is specified
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bidocs_opportunities')) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > 0) {
                rawItems.push(...parsed);
              }
            } catch (e) {}
          }
        }
      }
    }

    if (rawItems.length > 0) {
      const rawList: OpportunityProjectOption[] = rawItems.map((item: any, idx: number) => {
        const rawDateTime = item.submissionDeadlineDatetime || item.submissionDeadlineDate || item.submissionDeadline || item.dateSubmitted || '';

        let formattedDateTime = '';
        if (rawDateTime) {
          if (rawDateTime.includes('T')) {
            formattedDateTime = rawDateTime.substring(0, 16);
          } else if (rawDateTime.includes(' ')) {
            formattedDateTime = rawDateTime.replace(' ', 'T').substring(0, 16);
          } else {
            const timePart = item.submissionDeadlineTime || item.submissionTime || '14:00';
            formattedDateTime = `${rawDateTime}T${timePart}`;
          }
        } else {
          const today = new Date().toISOString().split('T')[0];
          formattedDateTime = `${today}T14:00`;
        }

        return {
          id: item.id || `opp-stg-${idx}`,
          refNo: item.projectReferenceNumber || item.philgepsRefNo || item.refNo || `PRJ-${idx + 1}`,
          solicitationNo: item.solicitationNumber || item.solicitationNo || 'N/A',
          title: item.title || item.biddingProjectTitle || 'Untitled Opportunity',
          procuringEntity: typeof item.procuringEntity === 'string'
            ? item.procuringEntity
            : item.procuringEntity?.name || item.procuringEntityName || 'Government Agency',
          abc: item.approvedBudgetStr || (item.approvedBudgetValue ? `₱${Number(item.approvedBudgetValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : (item.approvedBudget ? `₱${Number(item.approvedBudget).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '₱0.00')),
          dateTimeSubmitted: formattedDateTime
        };
      });

      // Strict Deduplication by ID & Reference Number
      const seenKeys = new Set<string>();
      const uniqueProjects: OpportunityProjectOption[] = [];

      for (const proj of rawList) {
        const dedupeKey = `${proj.id}::${proj.refNo}`.toLowerCase();
        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          uniqueProjects.push(proj);
        }
      }

      // #region agent log
      debugLog('opportunityProjects.ts:getOpportunityProjects', 'Project list resolved', {
        tenantId: tenantId || null,
        projectCount: uniqueProjects.length,
        rawItemCount: rawItems.length
      }, 'E');
      // #endregion

      return uniqueProjects;
    }
  } catch (e) {
    console.error('[OpportunityProjects] Error reading storage:', e);
  }

  // #region agent log
  debugLog('opportunityProjects.ts:getOpportunityProjects', 'Project list resolved', {
    tenantId: tenantId || null,
    projectCount: 0,
    scannedAllTenants: !tenantId
  }, 'E');
  // #endregion

  return [];
};
