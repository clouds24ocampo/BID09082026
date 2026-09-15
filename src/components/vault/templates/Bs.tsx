import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import {
  X,
  Download,
  CheckCircle2,
  Receipt,
  DollarSign,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  ShieldCheck
} from 'lucide-react';

export interface BsModalProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  procuringEntityAddress?: string;
  procuringEntityContactPerson?: string;
  headOfProcuringEntity?: string;
  headOfProcuringEntityPosition?: string;
  solicitationNumber?: string;
  contractAmount?: number;
  projectLocation?: string;
  dateTimeSubmitted?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

export const BsModalContent: React.FC<BsModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  procuringEntityAddress = '',
  procuringEntityContactPerson = '',
  headOfProcuringEntity: propHeadOfProcuringEntity = '',
  headOfProcuringEntityPosition: propHeadOfProcuringEntityPosition = '',
  solicitationNumber: propSolicitationNumber = '',
  contractAmount: propContractAmount = 0,
  projectLocation: propProjectLocation = '',
  dateTimeSubmitted: propDateTimeSubmitted = '',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [companyName, setCompanyName] = useState<string>(tenant?.companyName || '');
  const [companyAddress, setCompanyAddress] = useState<string>(tenant?.address || '');
  const [companyTin, setCompanyTin] = useState<string>(tenant?.tin || '000-000-000-000');
  const [projectTitle, setProjectTitle] = useState<string>(activeProjectTitle || '');
  const [projectRefNo, setProjectRefNo] = useState<string>(activeProjectRefNo || '');
  const [procuringEntity, setProcuringEntity] = useState<string>(activeProcuringEntity || '');
  const [entityTin, setEntityTin] = useState<string>('000-888-999-000');
  const [billingInvoiceNo, setBillingInvoiceNo] = useState<string>('BS-2026-001');
  const [billingDate, setBillingDate] = useState<string>(todayStr);

  // Billing Figures
  const [originalContractAmount, setOriginalContractAmount] = useState<number>(propContractAmount || 0);
  const [approvedVariationOrders, setApprovedVariationOrders] = useState<number>(0);
  const [grossAccomplishedThisPeriod, setGrossAccomplishedThisPeriod] = useState<number>(propContractAmount ? propContractAmount * 0.35 : 0);
  const [lessAdvanceRecoupment, setLessAdvanceRecoupment] = useState<number>(propContractAmount ? propContractAmount * 0.35 * 0.15 : 0);
  const [lessRetentionMoney, setLessRetentionMoney] = useState<number>(propContractAmount ? propContractAmount * 0.35 * 0.10 : 0);
  const [lessVat5, setLessVat5] = useState<number>(0);
  const [lessEwt2, setLessEwt2] = useState<number>(0);
  const [otherLiquidatedDeductions, setOtherLiquidatedDeductions] = useState<number>(0);

  // Bank Remittance Info
  const [bankName, setBankName] = useState<string>('Land Bank of the Philippines / BDO');
  const [accountName, setAccountName] = useState<string>(tenant?.companyName || '');
  const [accountNumber, setAccountNumber] = useState<string>('1892-0948-22');

  // Signatories
  const [signatoryName, setSignatoryName] = useState<string>(tenant?.authorizedSignatory?.name || '');
  const [signatoryTitle, setSignatoryTitle] = useState<string>(tenant?.authorizedSignatory?.title || 'Finance Director / Managing Officer');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const projectScopeKey = (projectRefNo || selectedOppId || activeProjectRefNo || 'default').replace(/[^a-zA-Z0-9]/g, '_');

  const revisedContractAmount = originalContractAmount + approvedVariationOrders;
  const totalDeductions = lessAdvanceRecoupment + lessRetentionMoney + lessVat5 + lessEwt2 + otherLiquidatedDeductions;
  const netAmountPayable = grossAccomplishedThisPeriod - totalDeductions;

  useEffect(() => {
    const tenantId = tenant?.id || 'default';
    const list = getOpportunityProjects(tenantId);
    setOppProjects(list);

    if (tenant?.companyName) {
      setCompanyName(tenant.companyName);
      setAccountName(tenant.companyName);
    }
    if (tenant?.address) setCompanyAddress(tenant.address);
    if (tenant?.tin) setCompanyTin(tenant.tin);
    if (tenant?.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
    if (tenant?.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);

    const storageKey = `bidocs_bs_${tenantId}_${projectScopeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.projectTitle) setProjectTitle(parsed.projectTitle);
        if (parsed.projectRefNo) setProjectRefNo(parsed.projectRefNo);
        if (parsed.procuringEntity) setProcuringEntity(parsed.procuringEntity);
        if (parsed.billingInvoiceNo) setBillingInvoiceNo(parsed.billingInvoiceNo);
        if (parsed.billingDate) setBillingDate(parsed.billingDate);
        if (parsed.originalContractAmount) setOriginalContractAmount(parsed.originalContractAmount);
        if (parsed.approvedVariationOrders !== undefined) setApprovedVariationOrders(parsed.approvedVariationOrders);
        if (parsed.grossAccomplishedThisPeriod) setGrossAccomplishedThisPeriod(parsed.grossAccomplishedThisPeriod);
        if (parsed.lessAdvanceRecoupment !== undefined) setLessAdvanceRecoupment(parsed.lessAdvanceRecoupment);
        if (parsed.lessRetentionMoney !== undefined) setLessRetentionMoney(parsed.lessRetentionMoney);
        if (parsed.lessVat5 !== undefined) setLessVat5(parsed.lessVat5);
        if (parsed.lessEwt2 !== undefined) setLessEwt2(parsed.lessEwt2);
        if (parsed.otherLiquidatedDeductions !== undefined) setOtherLiquidatedDeductions(parsed.otherLiquidatedDeductions);
        if (parsed.bankName) setBankName(parsed.bankName);
        if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
        return;
      }
    } catch (e) {
      console.error('[Bs] Storage load error:', e);
    }

    if (list.length > 0 && !selectedOppId) {
      const match = activeProjectRefNo ? list.find(p => p.refNo === activeProjectRefNo) : null;
      const target = match || list[0];
      if (target) {
        setSelectedOppId(target.id);
        setProjectTitle(target.title);
        setProjectRefNo(target.refNo);
        setProcuringEntity(target.procuringEntity);
        const amt = Number((target as any).abc || (target as any).contractAmount || 0);
        if (amt > 0) {
          setOriginalContractAmount(amt);
          setGrossAccomplishedThisPeriod(amt * 0.35);
          setLessAdvanceRecoupment(amt * 0.35 * 0.15);
          setLessRetentionMoney(amt * 0.35 * 0.10);
          setLessVat5(amt * 0.35 * 0.05);
          setLessEwt2(amt * 0.35 * 0.02);
        }
      }
    }
  }, [tenant, activeProjectRefNo, projectScopeKey]);

  const handleSaveState = () => {
    const tenantId = tenant?.id || 'default';
    const storageKey = `bidocs_bs_${tenantId}_${projectScopeKey}`;
    const payload = {
      companyName,
      companyAddress,
      companyTin,
      projectTitle,
      projectRefNo,
      procuringEntity,
      entityTin,
      billingInvoiceNo,
      billingDate,
      originalContractAmount,
      approvedVariationOrders,
      grossAccomplishedThisPeriod,
      lessAdvanceRecoupment,
      lessRetentionMoney,
      lessVat5,
      lessEwt2,
      otherLiquidatedDeductions,
      bankName,
      accountName,
      accountNumber,
      signatoryName,
      signatoryTitle
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('[Bs] Save state error:', e);
    }
  };

  const generatePdf = async (): Promise<string | null> => {
    const printArea = document.getElementById('bs-print-sheet');
    if (!printArea) return null;
    try {
      setIsSaving(true);
      handleSaveState();

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfDoc = await PDFDocument.create();
      // Philippine Legal: 8.5" x 13" -> 612 x 936 pt
      const page = pdfDoc.addPage([612, 936]);
      const img = await pdfDoc.embedPng(imgData);

      const margin = 24;
      const printableWidth = 612 - margin * 2;
      const printableHeight = 936 - margin * 2;
      const imgAspect = canvas.width / canvas.height;

      let drawWidth = printableWidth;
      let drawHeight = printableWidth / imgAspect;

      if (drawHeight > printableHeight) {
        drawHeight = printableHeight;
        drawWidth = printableHeight * imgAspect;
      }

      const x = margin + (printableWidth - drawWidth) / 2;
      const y = 936 - margin - drawHeight;

      page.drawImage(img, { x, y, width: drawWidth, height: drawHeight });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[Bs] Generate PDF error:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    const dataUrl = await generatePdf();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Billing_Statement_${projectRefNo || 'Project'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndComplete = async () => {
    const dataUrl = await generatePdf();
    if (dataUrl && onSaveAndComplete) {
      onSaveAndComplete(
        dataUrl,
        'Billing Statement (BS)',
        projectRefNo,
        projectTitle
      );
    }
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Contractor's Billing Statement (BS) / Statement of Account
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Official Invoice Computation • Tax Withholding Breakdown • Philippine Legal (8.5" x 13")
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isSaving}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleSaveAndComplete}
            disabled={isSaving}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Attach to Vault</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Form (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Billing Information
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Project Title</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Billing Statement No.</label>
                <input
                  type="text"
                  value={billingInvoiceNo}
                  onChange={(e) => setBillingInvoiceNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Billing Date</label>
                <input
                  type="text"
                  value={billingDate}
                  onChange={(e) => setBillingDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Contract / Ref No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Billing Figures */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Billing Figures & Deductions
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Original Contract (₱)</label>
                <input
                  type="number"
                  value={originalContractAmount || ''}
                  onChange={(e) => setOriginalContractAmount(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Gross Billing This Period (₱)</label>
                <input
                  type="number"
                  value={grossAccomplishedThisPeriod || ''}
                  onChange={(e) => {
                    const gross = Number(e.target.value);
                    setGrossAccomplishedThisPeriod(gross);
                    setLessAdvanceRecoupment(gross * 0.15);
                    setLessRetentionMoney(gross * 0.10);
                    setLessVat5(gross * 0.05);
                    setLessEwt2(gross * 0.02);
                  }}
                  className="w-full mt-1 bg-slate-950 border border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-slate-400">15% Advance Recoupment</label>
                <input
                  type="number"
                  value={lessAdvanceRecoupment}
                  onChange={(e) => setLessAdvanceRecoupment(Number(e.target.value))}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">10% Retention Money</label>
                <input
                  type="number"
                  value={lessRetentionMoney}
                  onChange={(e) => setLessRetentionMoney(Number(e.target.value))}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-slate-400">5% Final VAT</label>
                <input
                  type="number"
                  value={lessVat5}
                  onChange={(e) => setLessVat5(Number(e.target.value))}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">2% EWT Withholding</label>
                <input
                  type="number"
                  value={lessEwt2}
                  onChange={(e) => setLessEwt2(Number(e.target.value))}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Bank Remittance Instructions
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex justify-center items-start">
          <div
            id="bs-print-sheet"
            className="w-[816px] min-h-[1248px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col justify-between text-[12px] leading-relaxed"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-lg font-black tracking-wide uppercase text-slate-900">{companyName || 'CONTRACTOR / FIRM NAME'}</h1>
                <p className="text-[11px] text-slate-600 uppercase tracking-wider">{companyAddress || 'Main Business Office Address, Philippines'}</p>
                <p className="text-[11px] text-slate-500 font-mono">TIN: {companyTin} • PhilGEPS: {tenant?.philgepsPlatinumNo || 'N/A'}</p>
              </div>

              {/* Title & Metadata */}
              <div className="flex justify-between items-start mb-6 border-b border-slate-300 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase">STATEMENT OF ACCOUNT / BILLING STATEMENT</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Billed To:</strong> {procuringEntity || 'Procuring Entity'}<br />
                    <strong>Project:</strong> {projectTitle || 'Project Title'}<br />
                    <strong>Contract / Ref No.:</strong> <span className="font-mono">{projectRefNo || 'N/A'}</span>
                  </p>
                </div>
                <div className="text-right text-xs space-y-1">
                  <p><strong>Invoice / Statement No.:</strong> <span className="font-mono font-bold text-blue-900">{billingInvoiceNo}</span></p>
                  <p><strong>Date:</strong> {billingDate}</p>
                  <p><strong>Terms:</strong> Progress Billing / Government Check</p>
                </div>
              </div>

              {/* Billing Table */}
              <div className="border border-slate-400 rounded overflow-hidden mb-6">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                      <th className="p-2 text-left">Description of Billing Item</th>
                      <th className="p-2 text-right w-36">Amount (PHP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-800">
                        Gross Progress Accomplishment for this Period
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        ₱ {grossAccomplishedThisPeriod.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 pl-6 text-red-700">Less: Recoupment of 15% Advance Payment</td>
                      <td className="p-2 text-right font-mono text-red-700">- ₱ {lessAdvanceRecoupment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 pl-6 text-red-700">Less: 10% Retention Money</td>
                      <td className="p-2 text-right font-mono text-red-700">- ₱ {lessRetentionMoney.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 pl-6 text-red-700">Less: 5% Final Withholding VAT</td>
                      <td className="p-2 text-right font-mono text-red-700">- ₱ {lessVat5.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 pl-6 text-red-700">Less: 2% Expanded Withholding Tax (EWT)</td>
                      <td className="p-2 text-right font-mono text-red-700">- ₱ {lessEwt2.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    {otherLiquidatedDeductions > 0 && (
                      <tr className="bg-slate-50">
                        <td className="p-2 pl-6 text-red-700">Less: Other Deductions / Liquidated Damages</td>
                        <td className="p-2 text-right font-mono text-red-700">- ₱ {otherLiquidatedDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-200 border-t-2 border-slate-900 text-slate-950 font-black text-[13px]">
                      <td className="p-3 uppercase">TOTAL NET AMOUNT DUE AND PAYABLE:</td>
                      <td className="p-3 text-right font-mono text-blue-950">
                        ₱ {netAmountPayable.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remittance & Payment Instructions */}
              <div className="p-4 bg-slate-50 border border-slate-300 rounded text-xs space-y-1.5 mb-6">
                <p className="font-bold text-slate-900 uppercase">BANK REMITTANCE & PAYMENT DETAILS:</p>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <p><strong>Bank Name:</strong> {bankName}</p>
                  <p><strong>Account Name:</strong> {accountName || companyName}</p>
                  <p><strong>Account Number:</strong> <span className="font-mono font-bold text-slate-900">{accountNumber}</span></p>
                  <p><strong>Account Type:</strong> Corporate Checking / Current</p>
                </div>
              </div>
            </div>

            {/* Bottom Signatures & QR */}
            <div className="pt-6 border-t border-slate-300">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Submitted by:</p>
                  <p className="font-bold underline uppercase text-slate-900 pt-6">{signatoryName || 'AUTHORIZED MANAGING OFFICER'}</p>
                  <p className="text-xs text-slate-600">{signatoryTitle || 'Finance / Project Director'}</p>
                </div>
              </div>

              <div className="mt-6 pt-2 border-t border-slate-100 flex justify-end items-center text-[9px] text-slate-400 font-mono">
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BsModal(props: BsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
        <VaultErrorBoundary>
          <BsModalContent {...props} />
        </VaultErrorBoundary>
      </div>
    </div>
  );
}
