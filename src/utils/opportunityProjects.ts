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
 * Parses the exact submission deadline date & time from Opportunity Finder.
 */
export const getOpportunityProjects = (): OpportunityProjectOption[] => {
  try {
    const saved = localStorage.getItem('bidocs_opportunities');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any, idx: number) => {
          // Extract exact submission deadline datetime set in Opportunity Finder
          const rawDateTime = item.submissionDeadlineDatetime || item.submissionDeadlineDate || item.submissionDeadline || item.dateSubmitted || '';
          
          let formattedDateTime = '';
          if (rawDateTime) {
            if (rawDateTime.includes('T')) {
              formattedDateTime = rawDateTime.substring(0, 16); // e.g. "2026-08-30T14:00"
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
      }
    }
  } catch (e) {
    console.error('[OpportunityProjects] Error reading storage:', e);
  }

  return [];
};
