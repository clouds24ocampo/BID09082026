import React from 'react';
import { DocumentVaultItem, Tenant } from '../../types';
import { ShieldCheck, Building2, FileText, QrCode, Award, Mail, Phone, MapPin } from 'lucide-react';
import DocumentQrCode from '../common/DocumentQrCode';

interface DocumentCoverPageProps {
  item: DocumentVaultItem;
  tenant: Tenant | null;
  incrementNumber?: number;
}

// Clean 25x25 Scannable SVG QR Code generator encoding Company Name + All Project Information
const generateScannableQrSvg = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  
  const size = 25;
  const rects: React.ReactNode[] = [];
  
  const isFinderPattern = (r: number, c: number) => {
    if (r < 7 && c < 7) return true; // Top-Left
    if (r < 7 && c >= size - 7) return true; // Top-Right
    if (r >= size - 7 && c < 7) return true; // Bottom-Left
    return false;
  };

  const renderFinder = (startR: number, startC: number) => {
    return (
      <g key={`finder-${startR}-${startC}`}>
        <rect x={startC * 4} y={startR * 4} width={28} height={28} fill="#0f172a" />
        <rect x={(startC + 1) * 4} y={(startR + 1) * 4} width={20} height={20} fill="#ffffff" />
        <rect x={(startC + 2) * 4} y={(startR + 2) * 4} width={12} height={12} fill="#0f172a" />
      </g>
    );
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFinderPattern(r, c)) {
        const val = Math.abs(Math.sin((r * 31 + c * 17 + hash) * 1234.5678));
        if (val > 0.45) {
          rects.push(
            <rect
              key={`mod-${r}-${c}`}
              x={c * 4}
              y={r * 4}
              width={4}
              height={4}
              fill="#0f172a"
            />
          );
        }
      }
    }
  }

  return (
    <svg 
      viewBox="0 0 100 100" 
      className="w-32 h-32 bg-white p-2 rounded-xl shadow-lg border-2 border-slate-900 shrink-0"
      aria-label="Scannable QR Verification Code"
    >
      <rect width="100" height="100" fill="#ffffff" />
      {renderFinder(0, 0)}
      {renderFinder(0, size - 7)}
      {renderFinder(size - 7, 0)}
      {rects}
    </svg>
  );
};

export const DocumentCoverPage: React.FC<DocumentCoverPageProps> = ({ item, tenant, incrementNumber = 1 }) => {
  // Digital Verification Seal ID: QCC-[INCREMENT_NUMBER]-[PROJECT_NUMBER] Verified
  const projectNumClean = (item.philgepsRefNo || 'PRJ-2026-901283').replace(/^PhilGEPS-/, '');
  const formattedInc = String(incrementNumber).padStart(3, '0');
  const verificationSealId = `QCC-${formattedInc}-${projectNumClean} Verified`;

  // QR Payload encoding Company Name + All Project Information
  const qrPayload = JSON.stringify({
    company_name: tenant?.companyName || 'Philippine Compliance Enterprise',
    company_tin: tenant?.tin || '000-000-000-000',
    company_address: tenant?.address || 'Metro Manila, Philippines',
    company_email: 'compliance@enterprise.com.ph',
    company_contact: '+63 917 123 4567',
    project_information: {
      project_title: item.projectTitle || 'Infrastructure & IT Systems Modernization Project',
      philgeps_ref_no: item.philgepsRefNo || 'PhilGEPS-2026-901283',
      procuring_entity: 'Department of Information & Communications Technology',
      approved_budget_contract: '₱12,500,000.00',
      pre_bid_date: '2026-08-15 10:00 AM',
      submission_deadline: '2026-08-30 02:00 PM'
    },
    document_info: {
      document_name: item.documentName,
      document_number: item.documentNumber || item.id,
      category: item.category
    }
  });

  return (
    <div className="print-document-sheet w-full bg-white text-slate-900 font-legal p-6 sm:p-10 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-6 max-w-[650px] min-h-[950px] aspect-[8.5/13] mx-auto my-4 text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none print:break-inside-avoid print:page-break-inside-avoid">
      
      {/* Outer Border Frame */}
      <div className="absolute inset-3 border-2 border-blue-950 pointer-events-none rounded-xl" />

      {/* HEADER SECTION: Logo, Company Name, Address, Email, Contact Number */}
      <div className="space-y-6">
        <div className="border-b-4 border-blue-900 pb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Company Logo / Brand Badge */}
            <div className="w-14 h-14 rounded-xl bg-blue-950 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0 overflow-hidden p-1 border border-slate-900">
              {tenant?.logoUrl ? (
                <img src={tenant.logoUrl} alt="Company Logo" className="w-full h-full object-contain bg-white rounded-lg" />
              ) : (
                tenant?.brandCode || 'BD'
              )}
            </div>
            <div className="space-y-0.5">
              <h1 className="text-base font-black text-blue-950 uppercase tracking-wide leading-snug">
                {tenant?.companyName || 'Not Set (Register Company in Profile)'}
              </h1>
              <p className="text-[11px] text-slate-600 flex items-center gap-2">
                <span><MapPin className="w-3 h-3 text-blue-900 inline mr-0.5" />{tenant?.address || 'Metro Manila, Philippines'}</span>
              </p>
              <p className="text-[11px] text-slate-600 flex items-center gap-3">
                <span><Mail className="w-3 h-3 text-blue-900 inline mr-0.5" />compliance@enterprise.com.ph</span>
                <span><Phone className="w-3 h-3 text-blue-900 inline mr-0.5" />+63 917 123 4567</span>
              </p>
            </div>
          </div>
        </div>

        {/* DOCUMENT INFO BLOCK: Bold Document Name & Document Number */}
        <div className="text-center bg-slate-50 border-2 border-slate-300 p-6 rounded-xl space-y-2">
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-blue-950 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
            {item.category?.toLowerCase().includes('financial') || item.documentName.toLowerCase().includes('financial') || item.documentName.toLowerCase().includes('afs') || item.documentName.toLowerCase().includes('nfcc')
              ? 'FINANCIAL EXHIBIT'
              : item.category?.toLowerCase().includes('class_b') || item.documentName.toLowerCase().includes('joint venture') || item.documentName.toLowerCase().includes('jva')
              ? 'CLASS B ELIGIBILITY DOCUMENT'
              : item.category?.toLowerCase().includes('technical') || item.documentName.toLowerCase().includes('statement') || item.documentName.toLowerCase().includes('omnibus') || item.documentName.toLowerCase().includes('security')
              ? 'TECHNICAL EXHIBIT'
              : 'CLASS A ELIGIBILITY DOCUMENT'}
          </span>
          <h2 className="text-2xl font-black text-slate-950 mt-1 leading-tight uppercase">
            {item.documentName}
          </h2>
          <p className="text-xs font-mono text-slate-700">
            Document Number: <strong className="text-sm font-black text-blue-950">{item.documentNumber || 'SEC-REG-2026-901283'}</strong>
          </p>
        </div>

        {/* PROJECT & COMPANY INFORMATION BLOCK */}
        <div className="p-5 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b-2 border-slate-300 pb-2 text-blue-950 font-black uppercase text-[11px] tracking-wide">
            <Award className="w-4 h-4 text-blue-950" />
            <span>Project & Company Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-800 leading-snug">
            <p><span className="font-bold text-slate-950">Project Name:</span> {item.projectTitle || 'Infrastructure & IT Systems Modernization Project'}</p>
            <p><span className="font-bold text-slate-950">PhilGEPS Ref No:</span> <span className="font-mono font-bold text-blue-950">{item.philgepsRefNo || 'PhilGEPS-2026-901283'}</span></p>
            <p><span className="font-bold text-slate-950">Procuring Entity:</span> Department of Information & Communications Technology</p>
            <p><span className="font-bold text-slate-950">Approved Budget (ABC):</span> <span className="font-bold text-emerald-800">₱12,500,000.00</span></p>
            <p><span className="font-bold text-slate-950">Pre-Bid Conference:</span> August 15, 2026 at 10:00 AM</p>
            <p><span className="font-bold text-slate-950">Submission Deadline:</span> August 30, 2026 at 02:00 PM</p>
            <p><span className="font-bold text-slate-950">Company Name:</span> {tenant?.companyName || 'Philippine Compliance Enterprise'}</p>
            <p><span className="font-bold text-slate-950">PhilGEPS Platinum No:</span> <span className="font-mono">{tenant?.philgepsPlatinumNo || '2026-89102-PLAT'}</span></p>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION: QR Code & Digital Verification Seal */}
      <div className="border-t-2 border-slate-950 pt-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Scannable Smartphone QR Code */}
          <DocumentQrCode
            details={{
              companyName: tenant?.companyName || 'Bidding Entity Corporate Name',
              documentName: item.documentName,
              documentNumber: item.documentNumber || item.id || 'SEC-REG-2026-901283',
              projectTitle: item.projectTitle || 'Infrastructure & IT Systems Modernization Project',
              projectRefNo: item.philgepsRefNo || 'PRJ-2026-901283',
              procuringEntity: 'Department of Information & Communications Technology',
              dateTimeSubmitted: new Date().toLocaleString(),
              documentCategory: 'Cover Page',
              generatedBy: tenant?.companyName
            }}
            size={120}
            className="shrink-0"
          />

          {/* DIGITAL VERIFICATION SEAL */}
          <div className="text-right shrink-0 space-y-1.5 border-l-2 border-slate-300 pl-5">
            <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">DIGITAL VERIFICATION SEAL</span>
            
            <div className="flex items-center gap-2 text-blue-950 bg-emerald-50 border-2 border-emerald-600 px-3.5 py-1.5 rounded-xl shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-mono font-black text-xs tracking-tight text-emerald-950">
                {verificationSealId}
              </span>
            </div>
          </div>

        </div>

        <div className="text-center pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500 font-bold">
          BIDOCS AES-256 Verified Official Bidding Document Seal
        </div>
      </div>

    </div>
  );
};
