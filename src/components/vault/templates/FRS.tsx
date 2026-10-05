import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { autoFitPageChunks, calculateRowHeight } from '../../../utils/autoFitEngine';
import { legalPagesToPdfDataUrl } from '../../../utils/legalPagesPdf';
import {
  emptyFrs, formStorageKey, FrsRecord, frsResult, MoneyRow, readFormState, readFrs, swaTotals,
} from '../../../utils/paymentFormData';
import { Field, FormModalFrame, FormShell, INPUT_CLS, LegalPage, Panel, PaymentFormProps, peso, useLegalPdfActions } from './paymentFormShell';

const FRS_ROOT_ID = 'frs-print-root';

const RowsEditor: React.FC<{ rows: MoneyRow[]; onChange: (rows: MoneyRow[]) => void; placeholder: string }> = ({ rows, onChange, placeholder }) => (
  <div className="space-y-1.5">
    {rows.map((r, i) => (
      <div key={r.id} className="grid grid-cols-[1fr_110px_28px] gap-1.5">
        <input className={INPUT_CLS + ' mt-0'} value={r.label} placeholder={placeholder}
          onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
        <input className={INPUT_CLS + ' mt-0 font-mono text-right'} type="number" min={0} value={r.amount || ''}
          onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))} />
        <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 cursor-pointer" aria-label="Remove row">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
    <button type="button" onClick={() => onChange([...rows, { id: `r-${Date.now()}-${rows.length}`, label: '', amount: 0 }])}
      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
      <Plus className="w-3 h-3" /> Add row
    </button>
  </div>
);

type ScheduleRow = { group: string; label: string; amount: number };

export const FrsModalContent: React.FC<PaymentFormProps> = ({
  tenant, activeProjectRefNo = '', activeProjectTitle = '', activeProcuringEntity = '', contractAmount = 0, onSaveAndComplete, onClose,
}) => {
  const tenantId = tenant?.id || 'default';
  const [rec, setRec] = useState<FrsRecord>(() => {
    const saved = readFrs(tenantId, activeProjectRefNo);
    if (saved) return saved;
    const fresh = emptyFrs(contractAmount);
    fresh.finalValueOfWork = swaTotals(readFormState('swa', tenantId, activeProjectRefNo)).totalToDate;
    fresh.liquidatedDamages = Number(readFormState<any>('sote', tenantId, activeProjectRefNo)?.liquidatedDamages) || 0;
    return fresh;
  });
  const [preparedBy, setPreparedBy] = useState(tenant?.authorizedSignatory?.name || '');
  const [preparedByTitle, setPreparedByTitle] = useState(tenant?.authorizedSignatory?.title || 'Authorized Representative');
  const [reviewedBy, setReviewedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');

  const set = <K extends keyof FrsRecord>(k: K, v: FrsRecord[K]) => setRec((r) => ({ ...r, [k]: v }));
  const out = useMemo(() => frsResult(rec), [rec]);

  const persist = () => {
    try { localStorage.setItem(formStorageKey('frs', tenantId, activeProjectRefNo), JSON.stringify(rec)); } catch (e) { console.error('[FRS] Save state error:', e); }
  };
  useEffect(persist, [rec]); // keep downstream forms (FPL, BS) in sync

  const fillFromSwa = () => set('finalValueOfWork', swaTotals(readFormState('swa', tenantId, activeProjectRefNo)).totalToDate);
  const fillFromSote = () => set('liquidatedDamages', Number(readFormState<any>('sote', tenantId, activeProjectRefNo)?.liquidatedDamages) || 0);

  // Supporting schedule (VO / deductive / previous payments), paginated so long lists never overflow.
  const scheduleRows: ScheduleRow[] = [
    ...rec.variationOrders.map((r) => ({ group: 'Variation Order', label: r.label || '(unnamed)', amount: r.amount })),
    ...rec.deductiveOrders.map((r) => ({ group: 'Deductive Change Order', label: r.label || '(unnamed)', amount: -r.amount })),
    ...rec.previousPayments.map((r) => ({ group: 'Previous Payment', label: r.label || '(unnamed)', amount: r.amount })),
  ];
  const chunks = scheduleRows.length === 0 ? [] : autoFitPageChunks(scheduleRows, (r) => calculateRowHeight(`${r.group} ${r.label}`, 70, 14, 10, 26), {
    orientation: 'portrait', headerHeightPx: 140, footerHeightPx: 0, runningFooterPx: 30, strategy: 'greedy',
  });
  const totalPages = 1 + chunks.length;

  const gen = useLegalPdfActions(
    FRS_ROOT_ID, `Final_Payment_Reconciliation_${activeProjectRefNo || 'Project'}`, legalPagesToPdfDataUrl, persist,
    (dataUrl) => onSaveAndComplete?.(dataUrl, 'Final Payment Reconciliation Sheet (FRS)', activeProjectRefNo, activeProjectTitle), onClose,
  );

  const Line: React.FC<{ label: string; value: number; bold?: boolean; minus?: boolean; indent?: boolean }> = ({ label, value, bold, minus, indent }) => (
    <tr className={bold ? 'font-bold border-t border-slate-800' : ''}>
      <td className={`py-1 ${indent ? 'pl-6' : ''}`}>{label}</td>
      <td className="py-1 text-right font-mono">{minus && value !== 0 ? '- ' : ''}{peso(value)}</td>
    </tr>
  );

  const controls = (
    <>
      <Panel title="Law & Contract">
        <Field label="Procurement law applied">
          <select className={INPUT_CLS} value={rec.framework} onChange={(e) => set('framework', e.target.value as FrsRecord['framework'])}>
            <option value="RA_12009_NGPA">RA 12009 (NGPA)</option>
            <option value="RA_9184">RA 9184 (legacy)</option>
          </select>
        </Field>
        <Field label="Original contract price (PHP)">
          <input className={INPUT_CLS + ' font-mono'} type="number" min={0} value={rec.originalPrice || ''} onChange={(e) => set('originalPrice', Number(e.target.value))} />
        </Field>
        <Field label="Approved variation orders">
          <RowsEditor rows={rec.variationOrders} onChange={(r) => set('variationOrders', r)} placeholder="e.g. VO No. 1" />
        </Field>
        <Field label="Approved deductive change orders">
          <RowsEditor rows={rec.deductiveOrders} onChange={(r) => set('deductiveOrders', r)} placeholder="e.g. Deductive CO No. 1" />
        </Field>
      </Panel>

      <Panel title="Work accomplished & previous payments">
        <Field label="Final value of work accomplished (PHP)">
          <div className="flex gap-1.5">
            <input className={INPUT_CLS + ' font-mono'} type="number" min={0} value={rec.finalValueOfWork || ''} onChange={(e) => set('finalValueOfWork', Number(e.target.value))} />
            <button type="button" onClick={fillFromSwa} className="mt-1 px-2 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-blue-300 cursor-pointer whitespace-nowrap">Fill from SWA</button>
          </div>
        </Field>
        <Field label="Previous gross progress payments">
          <RowsEditor rows={rec.previousPayments} onChange={(r) => set('previousPayments', r)} placeholder="e.g. Progress Payment No. 1" />
        </Field>
      </Panel>

      <Panel title="Deductions">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={rec.onSchedule} onChange={(e) => set('onSchedule', e.target.checked)} />
          Work satisfactory and on schedule (no retention once past 50%)
        </label>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Retention %"><input className={INPUT_CLS} type="number" min={0} max={10} value={rec.retentionRate} onChange={(e) => set('retentionRate', Number(e.target.value))} /></Field>
          <Field label="Recoupment %"><input className={INPUT_CLS} type="number" min={0} max={100} value={rec.recoupmentRate} onChange={(e) => set('recoupmentRate', Number(e.target.value))} /></Field>
          <Field label="Advance balance"><input className={INPUT_CLS + ' font-mono'} type="number" min={0} value={rec.advanceBalance || ''} onChange={(e) => set('advanceBalance', Number(e.target.value))} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Third-party liab."><input className={INPUT_CLS + ' font-mono'} type="number" min={0} value={rec.thirdPartyLiabilities || ''} onChange={(e) => set('thirdPartyLiabilities', Number(e.target.value))} /></Field>
          <Field label="Uncorrected defects"><input className={INPUT_CLS + ' font-mono'} type="number" min={0} value={rec.uncorrectedDefects || ''} onChange={(e) => set('uncorrectedDefects', Number(e.target.value))} /></Field>
          <Field label="Other deductions"><input className={INPUT_CLS + ' font-mono'} type="number" min={0} value={rec.otherDeductions || ''} onChange={(e) => set('otherDeductions', Number(e.target.value))} /></Field>
        </div>
        <Field label="Liquidated damages (PHP)">
          <div className="flex gap-1.5">
            <input className={INPUT_CLS + ' font-mono'} type="number" min={0} value={rec.liquidatedDamages || ''} onChange={(e) => set('liquidatedDamages', Number(e.target.value))} />
            <button type="button" onClick={fillFromSote} className="mt-1 px-2 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-blue-300 cursor-pointer whitespace-nowrap">Fill from SOTE</button>
          </div>
        </Field>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={rec.applyTaxes} onChange={(e) => set('applyTaxes', e.target.checked)} /> Withhold VAT and EWT
        </label>
        {rec.applyTaxes && (
          <div className="grid grid-cols-3 gap-2 items-end">
            <Field label="VAT %"><input className={INPUT_CLS} type="number" min={0} value={rec.vatRate} onChange={(e) => set('vatRate', Number(e.target.value))} /></Field>
            <Field label="EWT %"><input className={INPUT_CLS} type="number" min={0} value={rec.ewtRate} onChange={(e) => set('ewtRate', Number(e.target.value))} /></Field>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-300 pb-2"><input type="checkbox" checked={rec.netOfVat} onChange={(e) => set('netOfVat', e.target.checked)} /> base ÷ 1.12</label>
          </div>
        )}
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={rec.finalAcceptanceIssued} onChange={(e) => set('finalAcceptanceIssued', e.target.checked)} />
          Certificate of Final Acceptance issued by the Procuring Entity
        </label>
      </Panel>

      <Panel title="Signatories">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Prepared by"><input className={INPUT_CLS} value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} /></Field>
          <Field label="Position"><input className={INPUT_CLS} value={preparedByTitle} onChange={(e) => setPreparedByTitle(e.target.value)} /></Field>
          <Field label="Reviewed by (Project Engineer)"><input className={INPUT_CLS} value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} /></Field>
          <Field label="Approved by"><input className={INPUT_CLS} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} /></Field>
        </div>
      </Panel>
    </>
  );

  return (
    <FormShell
      title="Final Payment Reconciliation Sheet (FRS)"
      subtitle="Contract price, work accomplished, previous payments and deductions • Philippine Legal (8.5&quot; x 13&quot;)"
      icon={<Calculator className="w-5 h-5" />}
      isSaving={gen.isSaving} onDownload={gen.download} onSave={gen.save} onClose={onClose} controls={controls}
    >
      <div id={FRS_ROOT_ID}>
        <LegalPage page={1} pages={totalPages}>
          <div className="text-center mb-4">
            <p className="text-[11px] tracking-wide">REPUBLIC OF THE PHILIPPINES</p>
            <p className="font-bold uppercase">{activeProcuringEntity || 'Procuring Entity'}</p>
            <h1 className="text-lg font-black tracking-wider uppercase mt-3 border-b-2 border-slate-900 pb-2">Final Payment Reconciliation Sheet</h1>
          </div>
          <table className="w-full text-[11.5px] mb-4">
            <tbody>
              <tr><td className="py-0.5 w-32 text-slate-500">Project</td><td className="font-semibold">{activeProjectTitle}</td></tr>
              <tr><td className="py-0.5 text-slate-500">Contract / Ref No.</td><td className="font-mono">{activeProjectRefNo}</td></tr>
              <tr><td className="py-0.5 text-slate-500">Contractor</td><td>{tenant?.companyName}</td></tr>
              <tr><td className="py-0.5 text-slate-500">Governing law</td><td>{rec.framework === 'RA_12009_NGPA' ? 'RA 12009 (NGPA) and its IRR' : 'RA 9184 and its IRR'}</td></tr>
            </tbody>
          </table>

          <table className="w-full text-[12px]">
            <tbody>
              <Line label="ORIGINAL CONTRACT PRICE" value={rec.originalPrice} bold />
              <Line label={`Approved variation orders (${rec.variationOrders.length})`} value={rec.variationOrders.reduce((a, r) => a + (Number(r.amount) || 0), 0)} indent />
              <Line label={`Approved deductive change orders (${rec.deductiveOrders.length})`} value={rec.deductiveOrders.reduce((a, r) => a + (Number(r.amount) || 0), 0)} minus indent />
              <Line label="FINAL CONTRACT PRICE" value={out.finalContractPrice} bold />
              <tr><td colSpan={2} className="py-2" />
              </tr>
              <Line label="FINAL VALUE OF WORK ACCOMPLISHED" value={rec.finalValueOfWork} bold />
              <Line label={`Previous payments (${rec.previousPayments.length})`} value={out.previousGrossTotal} minus indent />
              <Line label="CURRENT GROSS BILLING" value={out.currentGross} bold />
              <tr><td colSpan={2} className="pt-3 pb-1 text-[11px] font-bold uppercase text-slate-500">Less:</td></tr>
              <Line label={`Retention (${rec.retentionRate}% ${rec.onSchedule ? 'up to 50% of contract' : 'continuing, behind schedule'})`} value={out.retention} minus indent />
              <Line label={`Advance payment recoupment (${rec.recoupmentRate}%)`} value={out.recoupment} minus indent />
              <Line label="Third-party liabilities" value={out.thirdParty} minus indent />
              <Line label="Uncorrected defects" value={out.defects} minus indent />
              <Line label={`Value-added tax (${rec.vatRate}%)`} value={out.taxes.vat} minus indent />
              <Line label={`Expanded withholding tax (${rec.ewtRate}%)`} value={out.taxes.ewt} minus indent />
              <Line label="Liquidated damages" value={out.ld} minus indent />
              <Line label="Other authorized deductions" value={out.other} minus indent />
              <Line label="TOTAL DEDUCTIONS" value={out.totalDeductions} bold minus />
              <tr className="font-black text-[14px] border-t-2 border-slate-900"><td className="py-2">NET FINAL PAYMENT</td><td className="py-2 text-right font-mono">{peso(out.netPayment)}</td></tr>
            </tbody>
          </table>

          <p className="mt-4 text-[10.5px] text-slate-600">
            {rec.finalAcceptanceIssued
              ? 'Retention withheld on progress payments is due for release upon final acceptance, subject to the contract and applicable accounting and auditing rules.'
              : 'Retention remains with the Procuring Entity until the Certificate of Final Acceptance is issued.'}
          </p>

          <div className="grid grid-cols-3 gap-6 mt-10 text-center text-[11px]">
            {[['Prepared by', preparedBy, preparedByTitle], ['Reviewed by', reviewedBy, 'Project Engineer'], ['Approved by', approvedBy, 'Head of Procuring Entity']].map(([role, name, pos]) => (
              <div key={role}>
                <p className="text-slate-500 mb-8">{role}:</p>
                <p className="border-t border-slate-900 pt-1 font-bold uppercase">{name || ' '}</p>
                <p className="text-slate-600">{pos}</p>
              </div>
            ))}
          </div>
        </LegalPage>

        {chunks.map((rows, idx) => (
          <LegalPage key={idx} page={idx + 2} pages={totalPages}>
            <h2 className="text-sm font-black uppercase tracking-wide border-b-2 border-slate-900 pb-1 mb-3">
              Supporting Schedule {chunks.length > 1 ? `(${idx + 1} of ${chunks.length})` : ''}
            </h2>
            <table className="w-full text-[11.5px] border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="p-1.5 border border-slate-300 w-44">Type</th>
                  <th className="p-1.5 border border-slate-300">Reference / description</th>
                  <th className="p-1.5 border border-slate-300 w-40 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-1.5 border border-slate-300">{r.group}</td>
                    <td className="p-1.5 border border-slate-300">{r.label}</td>
                    <td className="p-1.5 border border-slate-300 text-right font-mono">{peso(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LegalPage>
        ))}
      </div>
    </FormShell>
  );
};

export default function FrsModal(props: PaymentFormProps) {
  return (
    <FormModalFrame>
      <FrsModalContent {...props} />
    </FormModalFrame>
  );
}
