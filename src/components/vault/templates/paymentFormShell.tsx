import React from 'react';
import { X, Download, CheckCircle2 } from 'lucide-react';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import type { Tenant } from '../../../types';

/** Props every statutory template modal receives from StatutoryModalHost. */
export interface PaymentFormProps {
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
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose?: () => void;
}

// Shared chrome for the final-payment forms (same look as the sibling statutory templates).

export const INPUT_CLS = 'w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white';

export const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={className}>
    <label className="text-[10px] font-semibold text-slate-400 uppercase">{label}</label>
    {children}
  </div>
);

export const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">{title}</h3>
    {children}
  </div>
);

export const peso = (n: number): string =>
  '₱ ' + (Number.isFinite(n) ? n : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** One 816x1248px Legal sheet. `data-legal-page` is how the PDF step finds the pages. */
export const LegalPage: React.FC<{ children: React.ReactNode; page: number; pages: number }> = ({ children, page, pages }) => (
  <div
    data-legal-page
    className="bg-white text-slate-900 p-12 shadow-2xl rounded-sm flex flex-col text-[12px] leading-relaxed mb-6"
    style={{ width: 816, height: 1248, boxSizing: 'border-box', overflow: 'hidden' }}
  >
    <div className="flex-1 min-h-0">{children}</div>
    <div className="pt-2 border-t border-slate-200 flex justify-end text-[9px] text-slate-400 font-mono">
      <span>Page {page} of {pages}</span>
    </div>
  </div>
);

interface ShellProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isSaving: boolean;
  onDownload: () => void;
  onSave: () => void;
  onClose?: () => void;
  controls: React.ReactNode;
  children: React.ReactNode; // preview pages
}

export const FormShell: React.FC<ShellProps> = ({ title, subtitle, icon, isSaving, onDownload, onSave, onClose, controls, children }) => (
  <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
    <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">{icon}</div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
          <p className="text-[11px] text-slate-400 font-mono">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          disabled={isSaving}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Download PDF</span>
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 border border-blue-400/40 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save & Attach to Vault'}</span>
        </button>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
      <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-slate-800 space-y-4 bg-slate-900/40">{controls}</div>
      <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-950 flex flex-col items-center">{children}</div>
    </div>
  </div>
);

export const FormModalFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
    <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] h-[94vh] flex flex-col">
      <VaultErrorBoundary>{children}</VaultErrorBoundary>
    </div>
  </div>
);

/** Shared download + save-to-vault plumbing for forms made of `[data-legal-page]` sheets. */
export const useLegalPdfActions = (
  rootId: string,
  fileBase: string,
  generate: (pages: HTMLElement[]) => Promise<string>,
  persist: () => void,
  onSaveAndComplete?: (dataUrl: string) => void,
  onClose?: () => void,
) => {
  const [isSaving, setIsSaving] = React.useState(false);

  const build = async (): Promise<string | null> => {
    const root = document.getElementById(rootId);
    if (!root) return null;
    try {
      setIsSaving(true);
      persist();
      return await generate(Array.from(root.querySelectorAll<HTMLElement>('[data-legal-page]')));
    } catch (err) {
      console.error(`[${fileBase}] Generate PDF error:`, err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const download = async () => {
    const dataUrl = await build();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${fileBase}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const save = async () => {
    const dataUrl = await build();
    if (dataUrl && onSaveAndComplete) onSaveAndComplete(dataUrl);
    if (dataUrl && onClose) onClose();
  };

  return { isSaving, download, save };
};
