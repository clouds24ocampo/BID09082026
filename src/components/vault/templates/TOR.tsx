import React from "react";
import { Tenant } from "../../../types";
import { FileText, Sparkles } from "lucide-react";

export interface TorScopeItem {
  id: string;
  itemNo: string;
  description: string;
  quantity: number;
  unit: string;
  specificationDetails?: string;
  timelineMilestone?: string;
}

export interface TorPersonnelItem {
  id: string;
  position: string;
  qualification: string;
  count: number;
}

export interface TorEquipmentItem {
  id: string;
  description: string;
  capacity: string;
  units: number;
}

export interface TorSignatory {
  role: "PREPARED_BY" | "CHECKED_BY" | "RECOMMENDING" | "APPROVED_BY";
  label: string;
  name: string;
  title: string;
  officeOrLicense: string;
}

export interface TermsOfReferenceProps {
  tenant?: Tenant | null;
  setActiveTab?: (tab: string) => void;
  onClose?: () => void;
  [key: string]: any;
}

/**
 * Terms of Reference (TOR) - Standalone Clean Slate
 * Completely separated from Program of Work (POW).
 * Total clean slate ready to create from scratch.
 */
export const TermsOfReferenceContent: React.FC<TermsOfReferenceProps> = ({
  tenant,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden min-h-[650px]">
      {/* Standalone TOR Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                TERMS OF REFERENCE (TOR)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Statutory Blank Slate
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Official Project Scope, Technical Specifications &amp; Deliverables (RA 9184 &amp; RA 12009) — Separated from POW
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tenant && (
            <span className="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              {tenant.companyName}
            </span>
          )}
        </div>
      </div>

      {/* Main Clean Canvas Body - Total Clean Slate */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center overflow-y-auto">
        <div className="max-w-lg w-full p-8 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
            Terms of Reference (TOR) Canvas
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            All previous source code, tabs, and preloaded inputs have been cleared. This is a dedicated, clean standalone space separated from Program of Work (POW). Ready to build from scratch.
          </p>
        </div>
      </div>
    </div>
  );
};

export const TermsOfReferenceModal: React.FC<TermsOfReferenceProps> = (props) => {
  return <TermsOfReferenceContent {...props} />;
};

export const TOR: React.FC<TermsOfReferenceProps> = TermsOfReferenceModal;
export const TorModal: React.FC<TermsOfReferenceProps> = TermsOfReferenceModal;

export default TermsOfReferenceContent;
