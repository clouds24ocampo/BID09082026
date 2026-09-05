/**
 * CENTRALIZED IMMUTABLE PROJECT CLASSIFICATION & DOCUMENT GOVERNANCE ENGINE
 * 
 * Single Source of Truth across Document Vault, Opportunity Finder, Bid Package Builder, and PDF Engine.
 * Guarantees zero regression when updating documents or modifying other parts of the codebase.
 */

export type ProjectClassification = 'INFRASTRUCTURE' | 'GOODS' | 'CONSULTING';

export interface ProjectLike {
  id?: string;
  refNo?: string;
  philgepsRefNo?: string;
  title?: string;
  category?: string;
  procurementType?: string;
  classification?: string;
}

/**
 * Determines project classification with absolute priority:
 * 1. Explicit Category / Procurement Type from Opportunity / PhilGEPS (Supreme Authority)
 * 2. Fallback Title Analysis ONLY if category was not set
 */
export function getProjectClassification(project?: ProjectLike | null): ProjectClassification {
  if (!project) return 'GOODS';

  const rawCat = (project.procurementType || project.category || project.classification || '').toString().toUpperCase();

  // 1. SUPREME AUTHORITY: Explicit Category / Procurement Type
  if (rawCat.includes('INFRA') || rawCat.includes('CIVIL')) {
    return 'INFRASTRUCTURE';
  }
  if (rawCat.includes('CONSULT')) {
    return 'CONSULTING';
  }
  if (rawCat.includes('GOOD')) {
    return 'GOODS';
  }

  // 2. FALLBACK: Title & Reference Keyword Inference
  const titleLower = (project.title || '').toLowerCase();
  const refUpper = (project.philgepsRefNo || project.refNo || '').toUpperCase();

  if (
    refUpper.includes('INFRA') ||
    titleLower.includes('construction') ||
    titleLower.includes('civil works') ||
    titleLower.includes('road opening') ||
    titleLower.includes('drainage system') ||
    titleLower.includes('building') ||
    titleLower.includes('concreting') ||
    titleLower.includes('renovation') ||
    titleLower.includes('rehabilitation')
  ) {
    return 'INFRASTRUCTURE';
  }

  if (titleLower.includes('consult') || titleLower.includes('feasibility') || titleLower.includes('master plan')) {
    return 'CONSULTING';
  }

  return 'GOODS';
}

/**
 * Standardized Project Storage Keys to prevent cross-contamination between projects
 */
export function getProjectStorageKey(
  docType: 
    | 'SEC_VI' 
    | 'TECH_SPECS' 
    | 'ONGOING' 
    | 'SLCC' 
    | 'FAL' 
    | 'ORG_CHART' 
    | 'KEY_PERSONNEL' 
    | 'MAJOR_EQUIPMENT' 
    | 'AFTERSALES' 
    | 'NFCC' 
    | 'DETAILED_ESTIMATES' 
    | 'BOQ' 
    | 'PRICE_SCHED' 
    | 'SUMMARY_BID' 
    | 'CASH_FLOW' 
    | 'BIDFORM_INFRA' 
    | 'BIDFORM_GOODS'
    | 'PACKAGE_ITEMS',
  tenantId: string,
  projectScopeKey: string
): string {
  const cleanScope = (projectScopeKey || 'unassigned').trim();
  const cleanTenant = (tenantId || 'default').trim();

  switch (docType) {
    case 'SEC_VI': return `bidocs_sec_vi_${cleanTenant}_${cleanScope}`;
    case 'TECH_SPECS': return `bidocs_tech_specs_${cleanTenant}_${cleanScope}`;
    case 'ONGOING': return `bidocs_ongoing_${cleanTenant}_${cleanScope}`;
    case 'SLCC': return `bidocs_slcc_${cleanTenant}_${cleanScope}`;
    case 'FAL': return `bidocs_fal_${cleanTenant}_${cleanScope}`;
    case 'ORG_CHART': return `bidocs_org_chart_${cleanTenant}_${cleanScope}`;
    case 'KEY_PERSONNEL': return `bidocs_key_personnel_${cleanTenant}_${cleanScope}`;
    case 'MAJOR_EQUIPMENT': return `bidocs_equipment_${cleanTenant}_${cleanScope}`;
    case 'AFTERSALES': return `bidocs_aftersale_${cleanTenant}_${cleanScope}`;
    case 'NFCC': return `bidocs_nfcc_${cleanTenant}_${cleanScope}`;
    case 'DETAILED_ESTIMATES': return `bidocs_detailed_estimates_${cleanTenant}_${cleanScope}`;
    case 'BOQ': return `bidocs_boq_${cleanTenant}_${cleanScope}`;
    case 'PRICE_SCHED': return `bidocs_pricesched_${cleanTenant}_${cleanScope}`;
    case 'SUMMARY_BID': return `bidocs_summary_bid_price_${cleanTenant}_${cleanScope}`;
    case 'CASH_FLOW': return `bidocs_cash_flow_${cleanTenant}_${cleanScope}`;
    case 'BIDFORM_INFRA': return `bidocs_bidform_infra_${cleanTenant}_${cleanScope}`;
    case 'BIDFORM_GOODS': return `bidocs_bidform_goods_${cleanTenant}_${cleanScope}`;
    case 'PACKAGE_ITEMS': return `bidocs_package_items_${cleanTenant}_${cleanScope}`;
  }
}
