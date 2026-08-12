import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Calendar, Download, Printer, TrendingUp, X } from 'lucide-react';
import { Tenant } from '../../../types';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';

export interface CashFlowByQuarterModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const CashFlowByQuarterModal: React.FC<CashFlowByQuarterModalProps> = ({
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  onSaveAndComplete,
  onClose
}) => {
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState('');
  const [contractRefNo, setContractRefNo] = useState(activeProjectRefNo || '');
  const [contractName, setContractName] = useState(activeProjectTitle || '');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || '');
  const [companyName, setCompanyName] = useState(tenant?.companyName || '');
  const [dateSubmitted, setDateSubmitted] = useState(new Date().toISOString().split('T')[0]);
  const [q1, setQ1] = useState('25.00');
  const [q2, setQ2] = useState('35.00');
  const [q3, setQ3] = useState('25.00');
  const [q4, setQ4] = useState('15.00');
  const [q1Cash, setQ1Cash] = useState('3125000.00');
  const [q2Cash, setQ2Cash] = useState('4375000.00');
  const [q3Cash, setQ3Cash] = useState('3125000.00');
  const [q4Cash, setQ4Cash] = useState('1875000.00');

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    if (activeProjectRefNo) {
      const match = list.find((p) => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setContractRefNo(match.refNo);
        setContractName(match.title);
        setProcuringEntity(match.procuringEntity);
      } else {
        setContractRefNo(activeProjectRefNo);
        if (activeProjectTitle) setContractName(activeProjectTitle);
        if (activeProcuringEntity) setProcuringEntity(activeProcuringEntity);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setContractRefNo(first.refNo);
      setContractName(first.title);
      setProcuringEntity(first.procuringEntity);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant?.companyName) setCompanyName(tenant.companyName);
  }, [tenant]);

  const parseNum = (value: string) => {
    const cleaned = String(value || '0').replace(/[^0-9.-]+/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totals = useMemo(() => {
    const q1Value = parseNum(q1);
    const q2Value = parseNum(q2);
    const q3Value = parseNum(q3);
    const q4Value = parseNum(q4);
    const totalAccomplishment = q1Value + q2Value + q3Value + q4Value;
    const totalCashFlow = parseNum(q1Cash) + parseNum(q2Cash) + parseNum(q3Cash) + parseNum(q4Cash);
    return { totalAccomplishment, totalCashFlow };
  }, [q1, q2, q3, q4, q1Cash, q2Cash, q3Cash, q4Cash]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find((p) => p.id === oppId || p.refNo === oppId);
    if (found) {
      setContractRefNo(found.refNo);
      setContractName(found.title);
      setProcuringEntity(found.procuringEntity);
    }
  };

  const handleExportPdf = async () => {
    const fileName = `${contractRefNo || 'PROJECT'}_Cash_Flow_By_Quarter.pdf`;
    if (typeof document !== 'undefined') {
      const templateElems = document.querySelectorAll('.cashflow-paper');
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      }
    }
    onSaveAndComplete?.(undefined, fileName, contractRefNo, contractName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400 border border-purple-500/20"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <h3 className="text-base font-bold text-white">Cash Flow by Quarter</h3>
              <p className="text-xs text-slate-400">Quarterly payment schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-500">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Contract Ref. No.</label>
              <input value={contractRefNo} onChange={(e) => setContractRefNo(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Contract Name</label>
              <input value={contractName} onChange={(e) => setContractName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Procuring Entity</label>
              <input value={procuringEntity} onChange={(e) => setProcuringEntity(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Date Submitted</label>
              <input type="date" value={dateSubmitted} onChange={(e) => setDateSubmitted(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </div>
          </div>

          {oppProjects.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Project from Opportunity Finder</label>
              <select value={selectedOppId} onChange={(e) => handleSelectOpportunity(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                <option value="">Select project</option>
                {oppProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} ({project.refNo})</option>
                ))}
              </select>
            </div>
          )}

          <div className="cashflow-paper overflow-hidden rounded-xl border border-slate-700 bg-white text-slate-900">
            <div className="grid gap-4 border-b border-slate-300 bg-slate-100 p-4 text-sm md:grid-cols-4">
              <div><strong>Ref. No.</strong><div>{contractRefNo || '—'}</div></div>
              <div><strong>Contract Name</strong><div>{contractName || '—'}</div></div>
              <div><strong>Procuring Entity</strong><div>{procuringEntity || '—'}</div></div>
              <div><strong>Company</strong><div>{companyName || '—'}</div></div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 px-2 py-2">Quarter</th>
                    <th className="border border-slate-300 px-2 py-2">Accomplishment %</th>
                    <th className="border border-slate-300 px-2 py-2">Cash Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Q1', q1, q1Cash],
                    ['Q2', q2, q2Cash],
                    ['Q3', q3, q3Cash],
                    ['Q4', q4, q4Cash]
                  ].map(([label, acc, cash]) => (
                    <tr key={label as string}>
                      <td className="border border-slate-300 px-2 py-2 font-semibold">{label}</td>
                      <td className="border border-slate-300 px-2 py-2"><input value={acc as string} onChange={(e) => {
                        const target = e.target.value;
                        if (label === 'Q1') setQ1(target);
                        if (label === 'Q2') setQ2(target);
                        if (label === 'Q3') setQ3(target);
                        if (label === 'Q4') setQ4(target);
                      }} className="w-24 rounded border border-slate-300 px-2 py-1" /></td>
                      <td className="border border-slate-300 px-2 py-2"><input value={cash as string} onChange={(e) => {
                        const target = e.target.value;
                        if (label === 'Q1') setQ1Cash(target);
                        if (label === 'Q2') setQ2Cash(target);
                        if (label === 'Q3') setQ3Cash(target);
                        if (label === 'Q4') setQ4Cash(target);
                      }} className="w-32 rounded border border-slate-300 px-2 py-1" /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-semibold">
                    <td className="border border-slate-300 px-2 py-2">Total</td>
                    <td className="border border-slate-300 px-2 py-2">{totals.totalAccomplishment.toFixed(2)}%</td>
                    <td className="border border-slate-300 px-2 py-2">₱{totals.totalCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-300 bg-slate-100 p-4">
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"><Calendar className="h-4 w-4" /> {dateSubmitted}</div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"><Calculator className="h-4 w-4" /> Total Cash Flow</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowByQuarterModal;
