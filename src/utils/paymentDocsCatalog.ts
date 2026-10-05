// Final-payment checklist (payment.md sections A-F). Data only.
import type { ProjectDocCategory } from './projectDocStore';

export type PaymentSection = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type PaymentDocSource =
  | { kind: 'template'; type: string } // statutory template modal; stored as STATUTORY slot = type.toLowerCase()
  | { kind: 'upload'; category: Exclude<ProjectDocCategory, 'STATUTORY'>; slot: string };

export interface PaymentDocRow {
  key: string;
  section: PaymentSection;
  label: string;
  source: PaymentDocSource;
}

export const PAYMENT_SECTIONS: Record<PaymentSection, string> = {
  A: "Contractor's payment request",
  B: 'Technical completion documents',
  C: 'Time / schedule documents',
  D: 'Construction resource documents',
  E: 'Warranty / security',
  F: 'Turnover',
};

const t = (key: string, section: PaymentSection, label: string, type: string): PaymentDocRow => ({
  key, section, label, source: { kind: 'template', type },
});
const u = (
  key: string, section: PaymentSection, label: string,
  category: 'WIN_DOCS' | 'FINAL_PAYMENT', slot: string,
): PaymentDocRow => ({ key, section, label, source: { kind: 'upload', category, slot } });

export const PAYMENT_DOC_ROWS: PaymentDocRow[] = [
  t('a_letter', 'A', 'Letter request for final payment', 'FPL'),
  t('a_swa', 'A', 'Final Statement of Work Accomplished / progress billing', 'SWA'),
  t('a_cert_payment', 'A', 'Final monthly certificate of payment', 'BS'),
  t('a_sote', 'A', 'Statement of time elapsed', 'SOTE'),
  t('a_affidavit', 'A', "Contractor's affidavit", 'CA'),
  t('a_lmec', 'A', 'Certificate of payment of laborers, materials and equipment', 'LMEC'),
  t('a_backup', 'A', 'Back-up computations and previous payment records', 'FRS'),
  u('a_tax', 'A', 'Tax documents', 'FINAL_PAYMENT', 'bir_tax_clearance'),

  u('b_inspection', 'B', 'Final inspection report', 'FINAL_PAYMENT', 'final_inspection'),
  u('b_completion', 'B', 'Certificate of completion / acceptance', 'FINAL_PAYMENT', 'cert_completion_acceptance'),
  t('b_asbuilt', 'B', 'Final as-built plans', 'ABP'),
  t('b_tests', 'B', 'Material test reports', 'MTS'),
  t('b_photos', 'B', 'Geotagged photographs (before, during, after)', 'PROGRESS_PHOTO'),
  u('b_defects', 'B', 'Documentation that final-inspection defects were corrected', 'FINAL_PAYMENT', 'defect_correction'),

  t('c_pert', 'C', 'Approved construction schedule / PERT-CPM', 'PERT'),
  u('c_scurve', 'C', 'S-curve', 'FINAL_PAYMENT', 's_curve'),
  u('c_orders', 'C', 'Approved time extension and suspension/resume orders', 'FINAL_PAYMENT', 'time_orders'),

  t('d_manpower', 'D', 'Manpower schedule', 'MPDS'),
  t('d_equipment', 'D', 'Equipment utilization schedule', 'EUP'),
  t('d_method', 'D', 'Construction methodology', 'CMS'),
  u('d_cshp', 'D', 'Construction Safety and Health Program / DOLE approval', 'WIN_DOCS', 'dole_cert'),

  u('e_perf', 'E', 'Performance security', 'WIN_DOCS', 'performance_bond'),
  t('e_warranty', 'E', 'Warranty security', 'WS'),
  t('e_retention', 'E', 'Retention computation', 'FRS'),

  t('f_turnover', 'F', 'Turnover agreement and documents', 'TOA'),
  u('f_misc', 'F', 'O&M manuals, warranties, keys, accessories, inventory', 'FINAL_PAYMENT', 'turnover_misc'),
];

// Upload slots this checklist adds to the Project Status "Final Payment Document" tab.
export const NEW_FINAL_PAYMENT_SLOTS = [
  { key: 'final_inspection', title: 'Final Inspection Report', desc: 'Agency final inspection report with punch-list' },
  { key: 'defect_correction', title: 'Defect Correction Documentation', desc: 'Proof that defects noted at final inspection were corrected' },
  { key: 'time_orders', title: 'Time Extension / Suspension Orders', desc: 'Approved time extension, suspension and resume orders' },
  { key: 'turnover_misc', title: 'Turnover Documents (O&M, Warranties, Keys)', desc: 'Operation and maintenance manuals, warranties, keys, accessories and inventory' },
];

export const statutorySlotOf = (row: PaymentDocRow): string | null =>
  row.source.kind === 'template' ? row.source.type.toLowerCase() : null;
