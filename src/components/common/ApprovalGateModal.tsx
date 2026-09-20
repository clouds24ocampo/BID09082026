import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  isApproverRole,
  isPreparerRole,
  getRoleDisplayName,
} from "../../types";
import { DocumentApprovalRecord } from "../../utils/opportunityProjects";
import {
  ShieldAlert,
  CheckCircle2,
  Lock,
  X,
  Clock,
  FileText,
  ArrowRight,
} from "lucide-react";

interface ApprovalGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  docTitle: string;
  trackingOrRefNo: string;
  approvalRecord?: DocumentApprovalRecord | null;
  onSubmitForApproval: () => void;
  onApprove: (notes?: string) => void;
  onRevertToDraft?: () => void;
}

export const ApprovalGateModal: React.FC<ApprovalGateModalProps> = ({
  isOpen,
  onClose,
  docTitle,
  trackingOrRefNo,
  approvalRecord,
  onSubmitForApproval,
  onApprove,
  onRevertToDraft,
}) => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const currentRole = currentUser?.role;
  const isApprover = isApproverRole(currentRole);
  const isPreparer = isPreparerRole(currentRole);
  const status = approvalRecord?.status || "DRAFT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-slate-200 animate-scaleIn">
        {/* Header Strip */}
        <div className="px-6 py-4 bg-linear-to-r from-amber-950/70 via-slate-900 to-slate-950 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Executive Approval Required</span>
              </h3>
              <p className="text-xs text-amber-300/90">
                Official Print &amp; Export Gate Control
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Document Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Document:</span>
              </span>
              <span className="font-bold text-white">{docTitle}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Tracking / Ref ID:</span>
              <span className="font-mono font-bold text-blue-300">
                {trackingOrRefNo}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Current Status:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] border ${
                  status === "APPROVED"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : status === "PENDING_APPROVAL"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}
              >
                {status === "APPROVED"
                  ? "✓ APPROVED"
                  : status === "PENDING_APPROVAL"
                    ? "⏳ PENDING APPROVAL"
                    : "● DRAFT (UNAPPROVED)"}
              </span>
            </div>
            {approvalRecord?.submittedBy && (
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Submitted by:</span>
                <span className="text-slate-200">
                  {approvalRecord.submittedBy} (
                  {approvalRecord.submittedByRole || "Estimator"}) on{" "}
                  {approvalRecord.submittedAt || "N/A"}
                </span>
              </div>
            )}
          </div>

          {/* Statutory Governance Note */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200/90 leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">
                Why is printing gated?
              </p>
              <p className="mt-1 text-[11px] text-amber-200/80">
                To guarantee zero submission errors under Republic Act 9184 and
                RA 12009 (NGPA), technical estimates, price quotations, and
                bidding packages prepared by <strong>Estimators</strong> or{" "}
                <strong>Bid Managers</strong> must be formally verified and
                approved by the <strong>AMO / President / Company Owner</strong> or{" "}
                <strong>Higher Manager</strong> before official release and
                printing.
              </p>
            </div>
          </div>

          {/* Active User Context */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Active Account:</span>
              <span className="text-white font-bold">
                {currentUser?.fullName || "User"}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                isApprover
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"
              }`}
            >
              {getRoleDisplayName(currentUser?.role)}
            </span>
          </div>

          {/* Actions for APPROVER (Owner / Higher Manager) */}
          {isApprover && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 font-medium">
                  Approval Endorsement / Notes (Optional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Verified against TOR. Approved for official printing & submission."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onApprove(notes)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve &amp; Authorize Official Print ✓</span>
                </button>
                {onRevertToDraft && status === "APPROVED" && (
                  <button
                    type="button"
                    onClick={onRevertToDraft}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition text-xs"
                  >
                    Revert to Draft
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions for PREPARER (Estimator / Bid Manager) */}
          {isPreparer && (
            <div className="space-y-3.5 pt-1">
              {status === "DRAFT" ? (
                <button
                  type="button"
                  onClick={onSubmitForApproval}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition text-xs"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Submit to AMO / President for Approval ➔</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-2.5 text-blue-300 text-[11px]">
                  <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    This document has been submitted and is currently awaiting
                    review by the <strong>AMO / President</strong> or{" "}
                    <strong>Higher Manager</strong>.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalGateModal;
