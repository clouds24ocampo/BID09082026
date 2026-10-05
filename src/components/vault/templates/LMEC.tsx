import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { autoFitPageChunks, calculateRowHeight } from '../../../utils/autoFitEngine';
import { legalPagesToPdfDataUrl } from '../../../utils/legalPagesPdf';
import { formStorageKey, readFormState } from '../../../utils/paymentFormData';
import { round2 } from '../../../utils/finalPaymentCalc';
import { Field, FormModalFrame, FormShell, INPUT_CLS, LegalPage, Panel, PaymentFormProps, peso, useLegalPdfActions } from './paymentFormShell';

const LMEC_ROOT_ID = 'lmec-print-root';
const CATEGORIES = ['Labor', 'Materials', 'Equipment'] as const;
type Category = (typeof CATEGORIES)[number];

interface PaymentRow { id: string; category: Category; payee: string; description: string; amount: number; datePaid: string; proof: string }
interface LmecState { rows: PaymentRow[]; signatory: string; position: string }

const newRow = (category: Category = 'Labor'): PaymentRow => ({ id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, category, payee: '', description: '', amount: 0, datePaid: '', proof: '' });

export const LmecModalContent: React.FC<PaymentFormProps> = ({
  tenant, activeProjectRefNo = '', activeProjectTitle = '', activeProcuringEntity = '', contractAmount = 0, onSaveAndComplete, onClose,
}) => {
  const tenantId = tenant?.id || 'default';
  const [state, setState] = useState<LmecState>(() => {
    const saved = readFormState<Partial<LmecState>>('lmec', tenantId, activeProjectRefNo);
    return {
      rows: Array.isArray(saved?.rows) ? (saved!.rows as PaymentRow[]).filter((r) => r && typeof r === 'object') : [],
      signatory: saved?.signatory ?? tenant?.authorizedSignatory?.name ?? '',
      position: saved?.position ?? tenant?.authorizedSignatory?.title ?? 'Authorized Representative',
    };
  });

  const persist = () => {
    try { localStorage.setItem(formStorageKey('lmec', tenantId, activeProjectRefNo), JSON.stringify(state)); } catch (e) { console.error('[LMEC] Save state error:', e); }
  };
  useEffect(persist, [state]);

  const setRow = (id: string, patch: Partial<PaymentRow>) => setState((s) => ({ ...s, rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const totals = useMemo(() => {
    const by: Record<Category, number> = { Labor: 0, Materials: 0, Equipment: 0 };
    state.rows.forEach((r) => { by[r.category] = round2(by[r.category] + (Number(r.amount) || 0)); });
    return { by, all: round2(by.Labor + by.Materials + by.Equipment) };
  }, [state.rows]);

  // Last page carries totals, certification and signature, so reserve that height there.
  const chunks = autoFitPageChunks(state.rows, (r) => calculateRowHeight(`${r.payee} ${r.description} ${r.proof}`, 48, 14, 10, 28), {
    orientation: 'portrait', headerHeightPx: 190, footerHeightPx: 330, continuationTheadHeightPx: 30, runningFooterPx: 30, strategy: 'greedy',
  });
  const totalPages = chunks.length;

  const gen = useLegalPdfActions(
    LMEC_ROOT_ID, `Certificate_of_Payment_Labor_Materials_Equipment_${activeProjectRefNo || 'Project'}`, legalPagesToPdfDataUrl, persist,
    (dataUrl) => onSaveAndComplete?.(dataUrl, 'Certificate of Payment of Labor, Materials and Equipment (LMEC)', activeProjectRefNo, activeProjectTitle), onClose,
  );

  const controls = (
    <>
      <Panel title="Payments to labor, materials and equipment">
        <div className="space-y-3">
          {state.rows.map((r) => (
            <div key={r.id} className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1.5">
              <div className="grid grid-cols-[110px_1fr_28px] gap-1.5">
                <select className={INPUT_CLS + ' mt-0'} value={r.category} onChange={(e) => setRow(r.id, { category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input className={INPUT_CLS + ' mt-0'} placeholder="Worker / supplier / lessor" value={r.payee} onChange={(e) => setRow(r.id, { payee: e.target.value })} />
                <button type="button" aria-label="Remove row" onClick={() => setState((s) => ({ ...s, rows: s.rows.filter((x) => x.id !== r.id) }))} className="text-red-400 hover:text-red-300 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input className={INPUT_CLS + ' mt-0'} placeholder="Description (e.g. Mason, Cement, Backhoe rental)" value={r.description} onChange={(e) => setRow(r.id, { description: e.target.value })} />
              <div className="grid grid-cols-3 gap-1.5">
                <input className={INPUT_CLS + ' mt-0 font-mono'} type="number" min={0} placeholder="Amount" value={r.amount || ''} onChange={(e) => setRow(r.id, { amount: Number(e.target.value) })} />
                <input className={INPUT_CLS + ' mt-0'} type="date" value={r.datePaid} onChange={(e) => setRow(r.id, { datePaid: e.target.value })} />
                <input className={INPUT_CLS + ' mt-0'} placeholder="Proof (Payroll, OR…)" value={r.proof} onChange={(e) => setRow(r.id, { proof: e.target.value })} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setState((s) => ({ ...s, rows: [...s.rows, newRow(s.rows[s.rows.length - 1]?.category)] }))}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
            <Plus className="w-3 h-3" /> Add payment
          </button>
        </div>
      </Panel>
      <Panel title="Certifying officer">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Name"><input className={INPUT_CLS} value={state.signatory} onChange={(e) => setState((s) => ({ ...s, signatory: e.target.value }))} /></Field>
          <Field label="Position"><input className={INPUT_CLS} value={state.position} onChange={(e) => setState((s) => ({ ...s, position: e.target.value }))} /></Field>
        </div>
      </Panel>
    </>
  );

  return (
    <FormShell
      title="Certificate of Payment (Labor, Materials & Equipment)"
      subtitle="Payments tied to the project, with proof • Philippine Legal (8.5&quot; x 13&quot;)"
      icon={<ClipboardCheck className="w-5 h-5" />}
      isSaving={gen.isSaving} onDownload={gen.download} onSave={gen.save} onClose={onClose} controls={controls}
    >
      <div id={LMEC_ROOT_ID}>
        {chunks.map((rows, idx) => {
          const first = idx === 0;
          const last = idx === chunks.length - 1;
          return (
            <LegalPage key={idx} page={idx + 1} pages={totalPages}>
              {first && (
                <div className="mb-4">
                  <div className="text-center">
                    <p className="text-[11px] tracking-wide">REPUBLIC OF THE PHILIPPINES</p>
                    <p className="font-bold uppercase">{activeProcuringEntity || 'Procuring Entity'}</p>
                    <h1 className="text-base font-black tracking-wider uppercase mt-3 border-b-2 border-slate-900 pb-2">
                      Certificate of Payment of Laborers, Materials and Equipment
                    </h1>
                  </div>
                  <table className="w-full text-[11.5px] mt-3">
                    <tbody>
                      <tr><td className="py-0.5 w-32 text-slate-500">Project</td><td className="font-semibold">{activeProjectTitle}</td></tr>
                      <tr><td className="py-0.5 text-slate-500">Contract / Ref No.</td><td className="font-mono">{activeProjectRefNo}</td></tr>
                      <tr><td className="py-0.5 text-slate-500">Contractor</td><td>{tenant?.companyName}</td></tr>
                      <tr><td className="py-0.5 text-slate-500">Contract price</td><td className="font-mono">{contractAmount ? peso(contractAmount) : '—'}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
              <table className="w-full text-[11px] border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="p-1.5 border border-slate-300 w-20">Category</th>
                    <th className="p-1.5 border border-slate-300">Worker / supplier</th>
                    <th className="p-1.5 border border-slate-300">Description</th>
                    <th className="p-1.5 border border-slate-300 w-28 text-right">Amount</th>
                    <th className="p-1.5 border border-slate-300 w-20">Paid</th>
                    <th className="p-1.5 border border-slate-300 w-24">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="p-3 text-center text-slate-400">No payments entered yet.</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="p-1.5 border border-slate-300">{r.category}</td>
                      <td className="p-1.5 border border-slate-300">{r.payee}</td>
                      <td className="p-1.5 border border-slate-300">{r.description}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono">{peso(Number(r.amount) || 0)}</td>
                      <td className="p-1.5 border border-slate-300">{r.datePaid}</td>
                      <td className="p-1.5 border border-slate-300">{r.proof}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {last && (
                <div className="mt-5">
                  <table className="w-72 ml-auto text-[11.5px]">
                    <tbody>
                      {CATEGORIES.map((c) => (
                        <tr key={c}><td className="py-0.5">Total {c.toLowerCase()}</td><td className="py-0.5 text-right font-mono">{peso(totals.by[c])}</td></tr>
                      ))}
                      <tr className="font-bold border-t border-slate-900"><td className="py-1">TOTAL PAID</td><td className="py-1 text-right font-mono">{peso(totals.all)}</td></tr>
                    </tbody>
                  </table>
                  <p className="mt-5 text-justify">
                    I certify that the foregoing payments relate to labor, materials and equipment utilized for the execution of the subject project and that the information presented is true and correct.
                  </p>
                  <div className="mt-10 w-72 text-center">
                    <p className="border-t border-slate-900 pt-1 font-bold uppercase">{state.signatory || ' '}</p>
                    <p className="text-slate-600">{state.position}</p>
                    <p className="text-slate-600">{tenant?.companyName}</p>
                  </div>
                </div>
              )}
            </LegalPage>
          );
        })}
      </div>
    </FormShell>
  );
};

export default function LmecModal(props: PaymentFormProps) {
  return (
    <FormModalFrame>
      <LmecModalContent {...props} />
    </FormModalFrame>
  );
}
