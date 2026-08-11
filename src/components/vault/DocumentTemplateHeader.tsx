import React from 'react';

interface DocumentTemplateHeaderProps {
  projectRefNo?: string;
  solicitationNumber?: string;
  projectTitle?: string;
  procuringEntity?: string;
  dateTimeSubmitted?: string;
}

export const DocumentTemplateHeader: React.FC<DocumentTemplateHeaderProps> = ({
  projectRefNo,
  solicitationNumber,
  projectTitle,
  procuringEntity,
  dateTimeSubmitted
}) => {
  return (
    <div className="mb-6 rounded-3xl border border-slate-300 bg-slate-50 p-4 shadow-sm text-slate-900">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">PhilGEPS Reference No.</p>
          <p className="text-sm font-bold text-slate-900 break-words">{projectRefNo || 'N/A'}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Solicitation No.</p>
          <p className="text-sm font-bold text-slate-900 break-words">{solicitationNumber || 'N/A'}</p>
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Project Title / Project Name</p>
          <p className="text-sm font-bold text-slate-900 break-words">{projectTitle || 'N/A'}</p>
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Procuring Entity</p>
          <p className="text-sm font-bold text-slate-900 break-words">{procuringEntity || 'N/A'}</p>
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Submission Date & Time</p>
          <p className="text-sm font-bold text-slate-900 break-words">{dateTimeSubmitted || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};
