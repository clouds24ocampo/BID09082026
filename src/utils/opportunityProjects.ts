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
 * Strictly returns ONLY user-created/imported opportunities from Opportunity Finder, zero dummy data.
 */
export const getOpportunityProjects = (): OpportunityProjectOption[] => {
  try {
    const saved = localStorage.getItem('bidocs_opportunities');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any, idx: number) => {
          const dateStr = item.submissionDeadlineDate || item.submissionDeadline || item.dateSubmitted || new Date().toISOString().split('T')[0];
          const timeStr = item.submissionDeadlineTime || item.submissionTime || '14:00';
          const combinedDateTime = `${dateStr} ${timeStr}`.trim();

          return {
            id: item.id || `opp-stg-${idx}`,
            refNo: item.projectReferenceNumber || item.philgepsRefNo || item.refNo || `PRJ-${idx + 1}`,
            solicitationNo: item.solicitationNumber || item.solicitationNo || 'N/A',
            title: item.title || item.biddingProjectTitle || 'Untitled Opportunity',
            procuringEntity: typeof item.procuringEntity === 'string'
              ? item.procuringEntity
              : item.procuringEntity?.name || item.procuringEntityName || 'Government Agency',
            abc: item.approvedBudgetStr || (item.approvedBudgetValue ? `₱${Number(item.approvedBudgetValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '₱0.00'),
            dateTimeSubmitted: combinedDateTime
          };
        });
      }
    }
  } catch (e) {
    console.error('[OpportunityProjects] Error reading storage:', e);
  }

  // Strictly return empty array if no real opportunities saved in Opportunity Finder (Zero dummy fallback projects)
  return [];
};
