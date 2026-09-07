import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { savePdfData, loadPdfData, deletePdfData } from '../../../utils/vaultIndexedDB';
import DocumentQrCode from '../../common/DocumentQrCode';
import html2canvas from 'html2canvas';
import {
  X,
  Printer,
  Download,
  RotateCcw,
  FileText,
  UserCheck,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Edit3,
  Plus,
  Trash2,
  FileSpreadsheet,
  Layers,
  Save,
  Check,
  Paperclip,
  Eye,
  FileUp,
  FileCheck
} from 'lucide-react';

export interface KeyPersonnelModalProps {
  item: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  solicitationNumber?: string;
  dateTimeSubmitted?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export interface KeyPersonnelMatrixCol {
  id: string;
  position: string;
  name: string;
  address: string;
  dob: string;
  citizenship: string;
  civilStatus: string;
  yearsExperience: string;
  education: {
    elementarySchool: string;
    elementaryYear: string;
    highSchool: string;
    highSchoolYear: string;
    collegeSchool: string;
    collegeYear: string;
    postGradSchool: string;
    postGradYear: string;
    seminars: string;
  };
  prcLicenseNo: string;
  isSpecialColumn?: boolean;
  specialNote?: string;
  resumeFileName?: string;
  resumePdfId?: string;
}

export interface KeyPersonnelPage {
  id: string;
  cols: KeyPersonnelMatrixCol[];
}

// EXACT TEMPLATE PAGE 1 INITIAL DATA (10 Columns matching the official Exhibit)
const initialPage1Cols: KeyPersonnelMatrixCol[] = [
  {
    id: 'col-1-1',
    position: 'PROJECT\nMANAGER 1',
    name: 'Vin Ocampo',
    address: 'Pasay City',
    dob: '02/24/87',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '10',
    education: {
      elementarySchool: 'Juan Sumulong',
      elementaryYear: '1999',
      highSchool: 'Arellano',
      highSchoolYear: '2004',
      collegeSchool: 'M.A.P.U.A Manila',
      collegeYear: '2008',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-1-2',
    position: 'PROJECT\nMANAGER 2',
    name: 'Christian\nSagun',
    address: 'Calauag, Quezon',
    dob: '11/21/2001',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '2',
    education: {
      elementarySchool: 'Calauag East\nCentral\nElementary School',
      elementaryYear: '2014',
      highSchool: 'Hondagua\nNational High\nSchool',
      highSchoolYear: '2020',
      collegeSchool: 'PUP Lopez\nQuezon',
      collegeYear: '2024',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-1-3',
    position: 'PROJECT\nMANAGER 3',
    name: 'Mark Arjay\nVillagarcia',
    address: 'Sipocot,\nCamarines Sur',
    dob: '12/14/2003',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '1',
    education: {
      elementarySchool: 'Sipocot North\nCentral School',
      elementaryYear: '2013',
      highSchool: 'ALS Sipocot',
      highSchoolYear: '2023',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-1-4',
    position: 'Project\nCommunicatic\nEngineer 1',
    name: 'ALDRIN\nGODALLE',
    address: 'LAGUNA',
    dob: '09-28-80',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '20',
    education: {
      elementarySchool: '',
      elementaryYear: '',
      highSchool: '',
      highSchoolYear: '',
      collegeSchool: 'T.I.P. MANILA',
      collegeYear: '2002',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: '0000-846'
  },
  {
    id: 'col-1-5',
    position: 'Project\nElectrical\nEngineer 1',
    name: 'AARON\nJAMES\nCORTEZ',
    address: 'LAGUNA',
    dob: '09/26/1993',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '5',
    education: {
      elementarySchool: '',
      elementaryYear: '',
      highSchool: '',
      highSchoolYear: '',
      collegeSchool: 'P.U.P Manila',
      collegeYear: '2015',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: '00-58229'
  },
  {
    id: 'col-1-6',
    position: 'Accredited\nDPWH\nMaterials\nEngineer',
    name: '',
    address: '',
    dob: '',
    citizenship: '',
    civilStatus: '',
    yearsExperience: '',
    education: { elementarySchool: '', elementaryYear: '', highSchool: '', highSchoolYear: '', collegeSchool: '', collegeYear: '', postGradSchool: '', postGradYear: '', seminars: '' },
    prcLicenseNo: '',
    isSpecialColumn: true,
    specialNote: 'NO DPWH\nMATERIALS\nNEEDED\non\nthis\nPROJECT'
  },
  {
    id: 'col-1-7',
    position: 'NETWORK\nEngineer /\nForeMan',
    name: 'HAL DAVID\nFORTUNA',
    address: 'DASMA,\nCAVITE',
    dob: '08-28-74',
    citizenship: 'Filipino',
    civilStatus: 'Married',
    yearsExperience: '25',
    education: {
      elementarySchool: 'STA. ANA',
      elementaryYear: '1986',
      highSchool: 'MAKATI WEST',
      highSchoolYear: '1990',
      collegeSchool: 'P.M.I. College',
      collegeYear: '1992',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-1-8',
    position: 'NETWORK\nEngineer /\nForeMan',
    name: 'John Gerald\nRivera',
    address: 'DASMA,\nCAVITE',
    dob: '06-22-1986',
    citizenship: 'Filipino',
    civilStatus: 'Married',
    yearsExperience: '15',
    education: {
      elementarySchool: '',
      elementaryYear: '',
      highSchool: '',
      highSchoolYear: '',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-1-9',
    position: 'Qualified/Cert\nSafety\nand Health\nPersonnel',
    name: '',
    address: '',
    dob: '',
    citizenship: '',
    civilStatus: '',
    yearsExperience: '',
    education: { elementarySchool: '', elementaryYear: '', highSchool: '', highSchoolYear: '', collegeSchool: '', collegeYear: '', postGradSchool: '', postGradYear: '', seminars: '' },
    prcLicenseNo: '',
    isSpecialColumn: true,
    specialNote: '(COSH)\nCONSTRUCTION\nOCCUPATIONAL\nSAFETY\nand\nHEALTH'
  },
  {
    id: 'col-1-10',
    position: 'Other\npositions ( as\ndeemed\nnecessary\nby the\napplicant-\nfirm for this\nproject)',
    name: '',
    address: '',
    dob: '',
    citizenship: '',
    civilStatus: '',
    yearsExperience: '',
    education: { elementarySchool: '', elementaryYear: '', highSchool: '', highSchoolYear: '', collegeSchool: '', collegeYear: '', postGradSchool: '', postGradYear: '', seminars: '' },
    prcLicenseNo: '',
    isSpecialColumn: true,
    specialNote: 'NETWORK\nTECHNICIAN'
  }
];

// EXACT TEMPLATE PAGE 2 INITIAL DATA (9 Network Technicians matching the official Exhibit)
const initialPage2Cols: KeyPersonnelMatrixCol[] = [
  {
    id: 'col-2-1',
    position: 'NETWORK\nTECHNICIAN',
    name: 'Monico Lavadia',
    address: 'LAGUNA',
    dob: '5/6/1985',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '12',
    education: {
      elementarySchool: 'Lopez National',
      elementaryYear: '1998',
      highSchool: 'Imus National',
      highSchoolYear: '2002',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-2-2',
    position: 'NETWORK\nTECHNICIAN',
    name: 'Aldrin E. Casipit',
    address: 'DASMA CAVITE',
    dob: '10-27-1999',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '7',
    education: {
      elementarySchool: 'Dr.Jose P. Rizal',
      elementaryYear: '2012',
      highSchool: 'Dasmariñas North National',
      highSchoolYear: '2016',
      collegeSchool: 'Asian Institute of Science and Technology',
      collegeYear: '2018',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-2-3',
    position: 'NETWORK\nTECHNICIAN',
    name: 'Justine Esplago',
    address: 'DASMA CAVITE',
    dob: '05-15-1998',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '6',
    education: {
      elementarySchool: 'Dasmariñas',
      elementaryYear: '2015',
      highSchool: 'Dasmariñas Integrated',
      highSchoolYear: '2019',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-2-4',
    position: 'NETWORK\nTECHNICIAN',
    name: 'Heaven Esplado',
    address: 'DASMA CAVITE',
    dob: '12/1/2000',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '6',
    education: {
      elementarySchool: 'Dasmariñas',
      elementaryYear: '2015',
      highSchool: 'Dasmariñas Integrated',
      highSchoolYear: '2019',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-2-5',
    position: 'NETWORK\nTECHNICIAN',
    name: 'John Francis\nOcampo',
    address: 'MANILA',
    dob: '05-14-1989',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '12',
    education: {
      elementarySchool: 'Juan Sumulong',
      elementaryYear: '1999',
      highSchool: 'Arellano High',
      highSchoolYear: '2003',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-2-6',
    position: 'NETWORK\nTECHNICIAN',
    name: 'Olaray Ola',
    address: 'Manila',
    dob: '5/10/2000',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '5',
    education: {
      elementarySchool: 'Juan Sumulong',
      elementaryYear: '2015',
      highSchool: 'M.L.Q.',
      highSchoolYear: '2019',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-2-7',
    position: 'NETWORK\nTECHNICIAN',
    name: 'James Ola',
    address: 'Manila',
    dob: '6/2/1984',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '18',
    education: {
      elementarySchool: 'Juan Sumulong',
      elementaryYear: '1997',
      highSchool: 'M.L.Q.',
      highSchoolYear: '2001',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-2-8',
    position: 'NETWORK\nTECHNICIAN',
    name: 'Alfred Vargas',
    address: 'Manila',
    dob: '2/2/2000',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '4',
    education: {
      elementarySchool: 'Jose Abad',
      elementaryYear: '2015',
      highSchool: 'Arellano High',
      highSchoolYear: '2019',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-2-9',
    position: 'NETWORK\nTECHNICIAN',
    name: 'Ronald Santos',
    address: 'Taguig',
    dob: '01/16/1998',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    yearsExperience: '6',
    education: {
      elementarySchool: 'Jose Abad',
      elementaryYear: '2013',
      highSchool: 'Arellano High',
      highSchoolYear: '2017',
      collegeSchool: '',
      collegeYear: '',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  }
];

export const KeyPersonnelModal: React.FC<KeyPersonnelModalProps> = ({
  item,
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  solicitationNumber: propSolicitationNumber,
  dateTimeSubmitted: propDateTimeSubmitted,
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Projects dropdown state
  const [, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Editable Document Metadata Fields
  const [companyName, setCompanyName] = useState(tenant?.companyName || 'Quantum Cloud Corporation');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || 'PhilGEPS-2026-001');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle || 'PROPOSED INFRASTRUCTURE PROJECT');
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity || 'Procuring Entity Name');
  const [, setSolicitationNumber] = useState(propSolicitationNumber || 'SOL-2026-9901');
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState(propDateTimeSubmitted || todayStr);

  const [signatoryName, setSignatoryName] = useState(
    tenant?.authorizedSignatory?.name || (tenant as any)?.name || 'Authorized Signatory'
  );
  const [signatoryTitle, setSignatoryTitle] = useState(
    tenant?.authorizedSignatory?.title || 'President'
  );

  // Sync with tenant whenever it updates
  useEffect(() => {
    if (tenant?.authorizedSignatory?.name) {
      setSignatoryName(tenant.authorizedSignatory.name);
    } else if ((tenant as any)?.name) {
      setSignatoryName((tenant as any).name);
    }
    if (tenant?.authorizedSignatory?.title) {
      setSignatoryTitle(tenant.authorizedSignatory.title);
    }
    if (tenant?.companyName) {
      setCompanyName(tenant.companyName);
    }
  }, [tenant]);

  // Multi-Page Key Personnel Matrix State (2 Pages)
  const [keyPersonnelPages, setKeyPersonnelPages] = useState<KeyPersonnelPage[]>([
    { id: 'page-1', cols: initialPage1Cols },
    { id: 'page-2', cols: initialPage2Cols }
  ]);

  // Tab View Mode: 'all' | 'page-1' | 'page-2' | 'editor'
  const [activeTab, setActiveTab] = useState<'all' | 'page-1' | 'page-2' | 'editor'>('all');

  // Edit Drawer / Modal Target
  const [editingTarget, setEditingTarget] = useState<{ pageId: string; col: KeyPersonnelMatrixCol } | null>(null);

  // Active column file input target
  const [activeResumeUploadColId, setActiveResumeUploadColId] = useState<{ pageId: string; colId: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // PDF Preview State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>('');

  // Attachments Manager Modal State
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);

  // Computed attachment counts
  const totalPersonnelCount = keyPersonnelPages.reduce((acc, p) => acc + p.cols.filter(c => !c.isSpecialColumn).length, 0);
  const uploadedPersonnelCount = keyPersonnelPages.reduce((acc, p) => acc + p.cols.filter(c => !c.isSpecialColumn && !!c.resumeFileName).length, 0);

  // Project scope key for localStorage persistence
  const projectScopeKey = selectedOppId || projectRefNo || 'DEFAULT_PROJECT';

  // Sync project context when active project changes
  useEffect(() => {
    if (activeProjectRefNo) setProjectRefNo(activeProjectRefNo);
    if (activeProjectTitle) setProjectTitle(activeProjectTitle);
    if (activeProcuringEntity) setProcuringEntity(activeProcuringEntity);
    if (propSolicitationNumber) setSolicitationNumber(propSolicitationNumber);
    if (propDateTimeSubmitted) setDateTimeSubmitted(propDateTimeSubmitted);
  }, [activeProjectRefNo, activeProjectTitle, activeProcuringEntity, propSolicitationNumber, propDateTimeSubmitted]);

  // Load opportunity projects
  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);
    if (list.length > 0 && !selectedOppId) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      const solNo = (first as any).solicitationNo || (first as any).solicitationNumber;
      if (solNo) setSolicitationNumber(solNo);
      if (first.dateTimeSubmitted) setDateTimeSubmitted(first.dateTimeSubmitted);
    }
  }, [tenant?.id]);

  // Load fresh key personnel data matching the exact GPPB official template
  useEffect(() => {
    if (!tenant?.id) return;
    const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 1 && parsed[0].cols.length === 10) {
          // If already saved with 10 columns, ensure special columns 6, 9, 10 match the exact template notes
          const updated = parsed.map((page: KeyPersonnelPage) => {
            if (page.id === 'page-1') {
              return {
                ...page,
                cols: page.cols.map((col, idx) => {
                  const tmpl = initialPage1Cols[idx];
                  if (tmpl && tmpl.isSpecialColumn) {
                    return {
                      ...col,
                      isSpecialColumn: true,
                      position: tmpl.position,
                      specialNote: tmpl.specialNote
                    };
                  }
                  return col;
                })
              };
            }
            return page;
          });
          setKeyPersonnelPages(updated);
          localStorage.setItem(storageKey, JSON.stringify(updated));
          return;
        }
      } catch (e) {
        console.error('[KeyPersonnel] Error loading saved data:', e);
      }
    }
    // Default initial pages
    setKeyPersonnelPages([
      { id: 'page-1', cols: initialPage1Cols.map(c => ({ ...c, resumeFileName: undefined, resumePdfId: undefined })) },
      { id: 'page-2', cols: initialPage2Cols.map(c => ({ ...c, resumeFileName: undefined, resumePdfId: undefined })) }
    ]);
  }, [tenant?.id, projectScopeKey]);

  // Helper to update and persist key personnel pages
  const saveAndSetKeyPersonnelPages = (newPages: KeyPersonnelPage[]) => {
    setKeyPersonnelPages(newPages);
    if (tenant?.id) {
      const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(newPages));
      } catch (e) {
        console.error('[KeyPersonnel] Error saving to localStorage:', e);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  /**
   * Dedicated, foolproof PDF Generator for Key Personnel Legal Landscape Matrix.
   * Exactly fits 13" x 8.5" (936pt x 612pt) landscape per page with full height coverage.
   */
  const generateKeyPersonnelPdfDataUrl = async (): Promise<string | undefined> => {
    try {
      const pageElements = document.querySelectorAll('.key-personnel-sheet');
      if (!pageElements || pageElements.length === 0) {
        console.error('[KeyPersonnel] No .key-personnel-sheet elements found');
        return undefined;
      }

      const pdfDoc = await PDFDocument.create();
      const legalLandscape: [number, number] = [936, 612];

      for (let i = 0; i < pageElements.length; i++) {
        const sheetEl = pageElements[i] as HTMLElement;

        const canvas = await html2canvas(sheetEl, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1300,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll('input').forEach((inp) => {
              const span = clonedDoc.createElement('span');
              span.textContent = inp.value || '';
              span.className = inp.className;
              span.style.cssText = window.getComputedStyle(inp).cssText;
              span.style.display = 'inline-block';
              span.style.border = 'none';
              span.style.background = 'transparent';
              span.style.color = '#000000';
              if (inp.parentNode) inp.parentNode.replaceChild(span, inp);
            });
            clonedDoc.querySelectorAll('textarea').forEach((ta) => {
              const div = clonedDoc.createElement('div');
              div.textContent = ta.value || '';
              div.className = ta.className;
              div.style.cssText = window.getComputedStyle(ta).cssText;
              div.style.whiteSpace = 'pre-wrap';
              div.style.display = 'block';
              div.style.border = 'none';
              div.style.background = 'transparent';
              div.style.color = '#000000';
              if (ta.parentNode) ta.parentNode.replaceChild(div, ta);
            });
          },
          ignoreElements: (el) => {
            return (
              el.classList.contains('no-export') ||
              el.classList.contains('print:hidden') ||
              el.tagName === 'BUTTON'
            );
          }
        });

        const imgDataUrl = canvas.toDataURL('image/png');
        const pngImage = await pdfDoc.embedPng(imgDataUrl);
        const page = pdfDoc.addPage(legalLandscape);
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: 936,
          height: 612
        });

        // Append any attached personnel resumes if present
        const currentPageObj = keyPersonnelPages[i];
        if (currentPageObj) {
          for (const col of currentPageObj.cols) {
            if (col.resumePdfId) {
              try {
                const resumePdfData = await loadPdfData(col.resumePdfId);
                if (resumePdfData && resumePdfData.startsWith('data:application/pdf')) {
                  const base64Str = resumePdfData.split(',')[1] || resumePdfData;
                  const pdfBytes = Uint8Array.from(atob(base64Str), c => c.charCodeAt(0));
                  const srcPdf = await PDFDocument.load(pdfBytes);
                  const copiedPages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
                  copiedPages.forEach(p => pdfDoc.addPage(p));
                }
              } catch (err) {
                console.error(`[KeyPersonnel] Error appending resume PDF for ${col.name}:`, err);
              }
            }
          }
        }
      }

      const mergedPdfBytes = await pdfDoc.save();
      const rawBuffer = new ArrayBuffer(mergedPdfBytes.length);
      new Uint8Array(rawBuffer).set(mergedPdfBytes);
      const blob = new Blob([rawBuffer], { type: 'application/pdf' });
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[KeyPersonnel] Fatal PDF generation error:', err);
      return undefined;
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await generateKeyPersonnelPdfDataUrl();
      if (dataUrl) {
        const cleanCode = item.code.replace(/[^a-zA-Z0-9]/g, '');
        const cleanName = item.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const fileName = `${projectRefNo || 'PROJECT'}_Item_${cleanCode}_${cleanName}_${todayStr}.pdf`;

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Could not export PDF automatically. Please click the Print button to print or save as PDF.');
      }
    } catch (e) {
      console.error('[KeyPersonnel] Export error:', e);
      alert('Error during PDF export. Falling back to print.');
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await generateKeyPersonnelPdfDataUrl();
      onSaveAndComplete(dataUrl, `Item ${item.code} — ${item.name}`, projectRefNo, projectTitle);
      onClose();
    } catch (e) {
      console.error('[KeyPersonnelModal] Save Error:', e);
      onSaveAndComplete(undefined, `Item ${item.code} — ${item.name}`, projectRefNo, projectTitle);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  const updateKeyPersonnelColInPage = (pageId: string, colId: string, field: string, value: string) => {
    setKeyPersonnelPages(prevPages => {
      const updated = prevPages.map(page => {
        if (page.id !== pageId) return page;
        const updatedCols = page.cols.map(col => {
          if (col.id !== colId) return col;
          if (field.startsWith('edu.')) {
            const eduKey = field.replace('edu.', '');
            return { ...col, education: { ...col.education, [eduKey]: value } };
          }
          return { ...col, [field]: value };
        });
        return { ...page, cols: updatedCols };
      });
      if (tenant?.id) {
        const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
          console.error('[KeyPersonnel] Error saving to localStorage:', e);
        }
      }
      return updated;
    });
  };

  const updateKeyPersonnelColFields = (pageId: string, colId: string, fields: Partial<KeyPersonnelMatrixCol>) => {
    setKeyPersonnelPages(prevPages => {
      const updated = prevPages.map(page => {
        if (page.id !== pageId) return page;
        const updatedCols = page.cols.map(col => {
          if (col.id !== colId) return col;
          return { ...col, ...fields };
        });
        return { ...page, cols: updatedCols };
      });
      if (tenant?.id) {
        const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
          console.error('[KeyPersonnel] Error saving to localStorage:', e);
        }
      }
      return updated;
    });
  };

  const resetKeyPersonnelPages = () => {
    if (confirm('Reset Key Personnel Matrix to exact official template defaults?')) {
      const fresh = [
        { id: 'page-1', cols: initialPage1Cols },
        { id: 'page-2', cols: initialPage2Cols }
      ];
      saveAndSetKeyPersonnelPages(fresh);
    }
  };

  // Personnel Resume Upload Handler using IndexedDB
  const handleResumeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeResumeUploadColId) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF document for personnel resume.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const resumeId = `resume_${activeResumeUploadColId.colId}_${Date.now()}`;
        try {
          await savePdfData(resumeId, dataUrl);
          updateKeyPersonnelColFields(activeResumeUploadColId.pageId, activeResumeUploadColId.colId, {
            resumeFileName: file.name,
            resumePdfId: resumeId
          });
          if (editingTarget && editingTarget.col.id === activeResumeUploadColId.colId) {
            setEditingTarget({
              ...editingTarget,
              col: { ...editingTarget.col, resumeFileName: file.name, resumePdfId: resumeId }
            });
          }
          setActiveResumeUploadColId(null);
        } catch (err) {
          console.error('Failed to store personnel resume PDF in IndexedDB:', err);
          alert('Could not save resume PDF due to browser storage issue.');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Delete attached PDF Resume from IndexedDB and state immediately
  const handleDeleteResumeFile = async (pageId: string, colId: string, resumePdfId?: string) => {
    if (resumePdfId) {
      try {
        await deletePdfData(resumePdfId);
      } catch (err) {
        console.error('Failed to delete PDF from IndexedDB:', err);
      }
    }
    updateKeyPersonnelColFields(pageId, colId, {
      resumeFileName: undefined,
      resumePdfId: undefined
    });
    if (editingTarget && editingTarget.col.id === colId) {
      setEditingTarget({
        ...editingTarget,
        col: { ...editingTarget.col, resumeFileName: undefined, resumePdfId: undefined }
      });
    }
  };

  // Clear all attached PDF resumes across all pages
  const handleClearAllAttachments = async () => {
    if (confirm('Are you sure you want to remove ALL uploaded PDF attachments across all personnel?')) {
      for (const page of keyPersonnelPages) {
        for (const col of page.cols) {
          if (col.resumePdfId) {
            try {
              await deletePdfData(col.resumePdfId);
            } catch (err) {
              console.error('Error deleting PDF:', err);
            }
          }
        }
      }
      setKeyPersonnelPages(prevPages => {
        const updated = prevPages.map(page => ({
          ...page,
          cols: page.cols.map(col => ({
            ...col,
            resumeFileName: undefined,
            resumePdfId: undefined
          }))
        }));
        if (tenant?.id) {
          const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch (e) {
            console.error('[KeyPersonnel] Error saving to localStorage:', e);
          }
        }
        return updated;
      });
    }
  };

  // Preview attached PDF Resume
  const handlePreviewResumeFile = async (resumePdfId?: string, fileName?: string) => {
    if (!resumePdfId) return;
    try {
      const data = await loadPdfData(resumePdfId);
      if (data) {
        setPreviewPdfUrl(data);
        setPreviewPdfTitle(fileName || 'Personnel Resume PDF');
      } else {
        alert('Could not load attached PDF document.');
      }
    } catch (e) {
      console.error('Failed to load PDF preview:', e);
      alert('Error loading PDF document.');
    }
  };

  // Add new Column to a specific page
  const addColumnToPage = (pageId: string) => {
    const newId = `col-${Date.now()}`;
    const newCol: KeyPersonnelMatrixCol = {
      id: newId,
      position: 'NEW KEY\nPERSONNEL',
      name: 'Engr. Full Name',
      address: 'Metro Manila',
      dob: '01/01/1990',
      citizenship: 'Filipino',
      civilStatus: 'Single',
      yearsExperience: '5',
      education: {
        elementarySchool: '',
        elementaryYear: '',
        highSchool: '',
        highSchoolYear: '',
        collegeSchool: 'University Graduate',
        collegeYear: '2012',
        postGradSchool: '',
        postGradYear: '',
        seminars: ''
      },
      prcLicenseNo: '00-00000'
    };

    setKeyPersonnelPages(prevPages => {
      const updated = prevPages.map(page => {
        if (page.id !== pageId) return page;
        return { ...page, cols: [...page.cols, newCol] };
      });
      if (tenant?.id) {
        const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
          console.error('[KeyPersonnel] Error saving to localStorage:', e);
        }
      }
      return updated;
    });
  };

  // Remove Column from a page
  const removeColumnFromPage = (pageId: string, colId: string) => {
    if (confirm('Are you sure you want to delete this personnel column?')) {
      setKeyPersonnelPages(prevPages => {
        const updated = prevPages.map(page => {
          if (page.id !== pageId) return page;
          return { ...page, cols: page.cols.filter(c => c.id !== colId) };
        });
        if (tenant?.id) {
          const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch (e) {
            console.error('[KeyPersonnel] Error saving to localStorage:', e);
          }
        }
        return updated;
      });
    }
  };

  // Check if Page 2 exists
  const hasPage2 = keyPersonnelPages.some(p => p.id === 'page-2');

  // Add Page 2 (Network Technicians)
  const addPage2 = () => {
    if (!hasPage2) {
      setKeyPersonnelPages(prevPages => {
        const updated = [
          ...prevPages,
          { id: 'page-2', cols: initialPage2Cols.map(c => ({ ...c, resumeFileName: undefined, resumePdfId: undefined })) }
        ];
        if (tenant?.id) {
          const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch (e) {
            console.error('[KeyPersonnel] Error saving to localStorage:', e);
          }
        }
        return updated;
      });
      setActiveTab('page-2');
    }
  };

  // Delete Page 2 (Network Technicians)
  const deletePage2 = () => {
    if (confirm('Are you sure you want to delete Page 2 (Network Technicians & Crew)?')) {
      setKeyPersonnelPages(prevPages => {
        const updated = prevPages.filter(p => p.id !== 'page-2');
        if (tenant?.id) {
          const storageKey = `bidocs_key_personnel_${tenant.id}_${projectScopeKey}`;
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch (e) {
            console.error('[KeyPersonnel] Error saving to localStorage:', e);
          }
        }
        return updated;
      });
      if (activeTab === 'page-2') {
        setActiveTab('page-1');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden print:p-0 print:bg-white print:static">

      {/* PRINT STYLESHEET OVERRIDE FOR 100% 8.5" x 13" LANDSCAPE FIT WITH ZERO BLANK SPACE */}
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in landscape;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          button, input[type="file"], .no-export, .print\\:hidden {
            display: none !important;
          }
          .key-personnel-sheet {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0.28in 0.35in !important;
            width: 13in !important;
            height: 8.5in !important;
            max-width: 13in !important;
            max-height: 8.5in !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Hidden File Input for Personnel Resume Upload */}
      <input
        type="file"
        id="personnel-resume-input"
        accept=".pdf"
        onChange={handleResumeFileUpload}
        className="hidden"
      />

      {/* Modal Top Navigation Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between print:hidden no-export shrink-0 shadow-lg z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Item {item.code} — Key Personnel Matrix</span>
              <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-[10px] font-mono rounded border border-blue-700/50">
                100% Fit: 8.5" × 13" Landscape
              </span>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-mono rounded border border-emerald-700/50">
                2 Full-Height Pages
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Single-Square Merged Exemption Columns • Proportional Table Stretched to Full 8.5" × 13" Sheet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View / Edit Mode Switcher */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            {hasPage2 && (
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All 2 Pages</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('page-1')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'page-1' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Page 1 (Mgmt)</span>
            </button>
            {hasPage2 && (
              <button
                onClick={() => setActiveTab('page-2')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'page-2' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Page 2 (Techs)</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'editor' ? 'bg-purple-600 text-white shadow' : 'text-purple-300 hover:text-white hover:bg-purple-900/30'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Data Manager</span>
            </button>
          </div>

          {/* Dedicated Add / Delete Page 2 Button in Top Bar */}
          {hasPage2 ? (
            <button
              type="button"
              onClick={deletePage2}
              className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white border border-red-700/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
              title="Delete 2nd Page (Network Technicians)"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete 2nd Page</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={addPage2}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
              title="Click to add Page 2 for Network Technicians and support crew"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add 2nd Page</span>
            </button>
          )}

          {/* Prominent PDF Attachments Manager Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAttachmentsModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow border ${
                uploadedPersonnelCount > 0
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70 hover:bg-emerald-900 shadow-emerald-950/40'
                  : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
              title="Open Attachments & Resume Manager to View, Replace, or Delete PDF files"
            >
              <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
              <span>PDF Attachments: <strong className="font-mono text-white">{uploadedPersonnelCount} / {totalPersonnelCount}</strong></span>
            </button>

            {uploadedPersonnelCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllAttachments}
                className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Remove and delete all uploaded PDF files across all personnel"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            title="Export 8.5x13 Legal Landscape PDF"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? 'Generating PDF...' : 'Export Legal PDF'}</span>
          </button>

          <button
            onClick={resetKeyPersonnelPages}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Reset to Template Defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Print Legal Document"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Close Window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal Scrollable Workspace */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950 print:p-0 print:overflow-visible">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* EDITING DATA MANAGER TAB (WHEN ACTIVE)                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'editor' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-[1280px] mx-auto space-y-6 print:hidden no-export">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                  <span>Key Personnel Data Manager & Modifier</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Quickly view, edit, add, or delete personnel and attach resumes.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              >
                <Check className="w-4 h-4" />
                <span>Return to Paper View</span>
              </button>
            </div>

            {/* Page 1 List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-blue-400 uppercase tracking-wider">
                  Page 1: Key Management & Engineering Personnel (10 Columns)
                </span>
                <button
                  onClick={() => addColumnToPage('page-1')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 border border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add Personnel to Page 1</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {keyPersonnelPages[0].cols.map((col) => (
                  <div
                    key={col.id}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-blue-400 uppercase font-bold block">
                          {col.position.replace(/\n/g, ' ')}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {col.isSpecialColumn ? '(Special Exemption Notice)' : (col.name || 'Unnamed Personnel')}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingTarget({ pageId: 'page-1', col })}
                          className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg transition"
                          title="Edit Full Personnel Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeColumnFromPage('page-1', col.id)}
                          className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition"
                          title="Remove Column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {!col.isSpecialColumn ? (
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p><span className="text-slate-500">Address:</span> {col.address || '—'}</p>
                        <p><span className="text-slate-500">DOB:</span> {col.dob || '—'} • <span className="text-slate-500">Exp:</span> {col.yearsExperience || '0'} yrs</p>
                        <p><span className="text-slate-500">College:</span> {col.education.collegeSchool || col.education.elementarySchool || '—'}</p>
                        <p><span className="text-slate-500">PRC:</span> <span className="font-mono text-slate-300">{col.prcLicenseNo || 'NO PRC'}</span></p>
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/40 whitespace-pre-line">
                        {col.specialNote}
                      </div>
                    )}

                    {!col.isSpecialColumn && (
                      <div className="pt-1.5 border-t border-slate-850 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Resume PDF:</span>
                        <div className="flex items-center gap-1.5">
                          {col.resumeFileName ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePreviewResumeFile(col.resumePdfId, col.resumeFileName)}
                                className="px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/50 transition cursor-pointer"
                                title={`Preview ${col.resumeFileName}`}
                              >
                                <Eye className="w-3 h-3 text-emerald-400" />
                                <span className="max-w-[70px] truncate">{col.resumeFileName}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveResumeUploadColId({ pageId: 'page-1', colId: col.id });
                                  document.getElementById('personnel-resume-input')?.click();
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                title="Replace PDF"
                              >
                                <UploadCloud className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteResumeFile('page-1', col.id, col.resumePdfId)}
                                className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition cursor-pointer"
                                title="Delete attached PDF"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveResumeUploadColId({ pageId: 'page-1', colId: col.id });
                                document.getElementById('personnel-resume-input')?.click();
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                            >
                              <FileUp className="w-3 h-3" />
                              <span>Upload PDF</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Page 2 List in Data Manager */}
            {hasPage2 && keyPersonnelPages.find(p => p.id === 'page-2') ? (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-blue-400 uppercase tracking-wider">
                    Page 2: Network Technicians Crew ({keyPersonnelPages.find(p => p.id === 'page-2')?.cols.length || 0} Columns)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addColumnToPage('page-2')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      <span>Add Personnel Column</span>
                    </button>
                    <button
                      onClick={deletePage2}
                      className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs rounded-lg flex items-center gap-1.5 border border-red-800/60 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Delete Page 2</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                    <div
                      key={col.id}
                      className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-blue-400 uppercase font-bold block">
                            {col.position.replace(/\n/g, ' ')}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {col.name || 'Unnamed Technician'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingTarget({ pageId: 'page-2', col })}
                            className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg transition"
                            title="Edit Full Personnel Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeColumnFromPage('page-2', col.id)}
                            className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition"
                            title="Remove Column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p><span className="text-slate-500">Address:</span> {col.address || '—'}</p>
                        <p><span className="text-slate-500">DOB:</span> {col.dob || '—'} • <span className="text-slate-500">Exp:</span> {col.yearsExperience || '0'} yrs</p>
                        <p><span className="text-slate-500">School:</span> {col.education.highSchool || col.education.elementarySchool || '—'}</p>
                        <p><span className="text-slate-500">PRC:</span> <span className="font-mono text-slate-300">{col.prcLicenseNo || 'NO PRC'}</span></p>
                      </div>

                      <div className="pt-1.5 border-t border-slate-850 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Resume PDF:</span>
                        <div className="flex items-center gap-1.5">
                          {col.resumeFileName ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePreviewResumeFile(col.resumePdfId, col.resumeFileName)}
                                className="px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/50 transition cursor-pointer"
                                title={`Preview ${col.resumeFileName}`}
                              >
                                <Eye className="w-3 h-3 text-emerald-400" />
                                <span className="max-w-[70px] truncate">{col.resumeFileName}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveResumeUploadColId({ pageId: 'page-2', colId: col.id });
                                  document.getElementById('personnel-resume-input')?.click();
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                title="Replace PDF"
                              >
                                <UploadCloud className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteResumeFile('page-2', col.id, col.resumePdfId)}
                                className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition cursor-pointer"
                                title="Delete attached PDF"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveResumeUploadColId({ pageId: 'page-2', colId: col.id });
                                document.getElementById('personnel-resume-input')?.click();
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                            >
                              <FileUp className="w-3 h-3" />
                              <span>Upload PDF</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-center space-y-2 mt-4">
                <p className="text-xs text-slate-400">Page 2 (Network Technicians Crew) is currently deleted.</p>
                <button
                  onClick={addPage2}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Page 2 (Network Technicians Crew)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DEDICATED PERSONNEL DETAIL EDIT MODAL                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {editingTarget && (
          <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">
                    Edit Personnel Information
                  </h3>
                </div>
                <button
                  onClick={() => setEditingTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">POSITION TITLE (use linebreaks for column formatting):</label>
                  <textarea
                    value={editingTarget.col.position}
                    onChange={(e) => setEditingTarget({
                      ...editingTarget,
                      col: { ...editingTarget.col, position: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">FULL NAME:</label>
                    <input
                      type="text"
                      value={editingTarget.col.name}
                      onChange={(e) => setEditingTarget({
                        ...editingTarget,
                        col: { ...editingTarget.col, name: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">ADDRESS / LOCATION:</label>
                    <input
                      type="text"
                      value={editingTarget.col.address}
                      onChange={(e) => setEditingTarget({
                        ...editingTarget,
                        col: { ...editingTarget.col, address: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">DATE OF BIRTH:</label>
                    <input
                      type="text"
                      value={editingTarget.col.dob}
                      onChange={(e) => setEditingTarget({
                        ...editingTarget,
                        col: { ...editingTarget.col, dob: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">CITIZENSHIP:</label>
                    <input
                      type="text"
                      value={editingTarget.col.citizenship}
                      onChange={(e) => setEditingTarget({
                        ...editingTarget,
                        col: { ...editingTarget.col, citizenship: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">CIVIL STATUS:</label>
                    <input
                      type="text"
                      value={editingTarget.col.civilStatus}
                      onChange={(e) => setEditingTarget({
                        ...editingTarget,
                        col: { ...editingTarget.col, civilStatus: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">YEARS EXP:</label>
                    <input
                      type="text"
                      value={editingTarget.col.yearsExperience}
                      onChange={(e) => setEditingTarget({
                        ...editingTarget,
                        col: { ...editingTarget.col, yearsExperience: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Education Form Group */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-[11px] font-bold text-blue-400 font-mono uppercase">
                    Educational Background
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">ELEMENTARY SCHOOL:</label>
                      <input
                        type="text"
                        value={editingTarget.col.education.elementarySchool}
                        onChange={(e) => setEditingTarget({
                          ...editingTarget,
                          col: {
                            ...editingTarget.col,
                            education: { ...editingTarget.col.education, elementarySchool: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">YEAR GRADUATED:</label>
                      <input
                        type="text"
                        value={editingTarget.col.education.elementaryYear}
                        onChange={(e) => setEditingTarget({
                          ...editingTarget,
                          col: {
                            ...editingTarget.col,
                            education: { ...editingTarget.col.education, elementaryYear: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">HIGH SCHOOL:</label>
                      <input
                        type="text"
                        value={editingTarget.col.education.highSchool}
                        onChange={(e) => setEditingTarget({
                          ...editingTarget,
                          col: {
                            ...editingTarget.col,
                            education: { ...editingTarget.col.education, highSchool: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">YEAR GRADUATED:</label>
                      <input
                        type="text"
                        value={editingTarget.col.education.highSchoolYear}
                        onChange={(e) => setEditingTarget({
                          ...editingTarget,
                          col: {
                            ...editingTarget.col,
                            education: { ...editingTarget.col.education, highSchoolYear: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">COLLEGE / UNIVERSITY:</label>
                      <input
                        type="text"
                        value={editingTarget.col.education.collegeSchool}
                        onChange={(e) => setEditingTarget({
                          ...editingTarget,
                          col: {
                            ...editingTarget.col,
                            education: { ...editingTarget.col.education, collegeSchool: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">YEAR GRADUATED:</label>
                      <input
                        type="text"
                        value={editingTarget.col.education.collegeYear}
                        onChange={(e) => setEditingTarget({
                          ...editingTarget,
                          col: {
                            ...editingTarget.col,
                            education: { ...editingTarget.col.education, collegeYear: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400">POST-GRADUATE (OPTIONAL):</label>
                      <input
                        type="text"
                        value={editingTarget.col.education.postGradSchool}
                        onChange={(e) => setEditingTarget({
                          ...editingTarget,
                          col: {
                            ...editingTarget.col,
                            education: { ...editingTarget.col.education, postGradSchool: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">YEAR GRADUATED:</label>
                      <input
                        type="text"
                        value={editingTarget.col.education.postGradYear}
                        onChange={(e) => setEditingTarget({
                          ...editingTarget,
                          col: {
                            ...editingTarget.col,
                            education: { ...editingTarget.col.education, postGradYear: e.target.value }
                          }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400">TECHNICAL SEMINARS / CERTIFICATIONS:</label>
                    <input
                      type="text"
                      value={editingTarget.col.education.seminars}
                      onChange={(e) => setEditingTarget({
                        ...editingTarget,
                        col: {
                          ...editingTarget.col,
                          education: { ...editingTarget.col.education, seminars: e.target.value }
                        }
                      })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">PRC LICENSE NO.:</label>
                  <input
                    type="text"
                    value={editingTarget.col.prcLicenseNo}
                    onChange={(e) => setEditingTarget({
                      ...editingTarget,
                      col: { ...editingTarget.col, prcLicenseNo: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>

                {/* PDF Resume Attachment Manager in Form */}
                {!editingTarget.col.isSpecialColumn && (
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-400 font-mono uppercase flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Attached Resume PDF Document</span>
                      </span>
                      {editingTarget.col.resumeFileName ? (
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-mono rounded border border-emerald-700/50 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>PDF Attached</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">No PDF Attached</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs text-slate-300 font-mono truncate max-w-sm">
                        {editingTarget.col.resumeFileName || 'Attach PDF resume (appended after matrix in export)'}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveResumeUploadColId({ pageId: editingTarget.pageId, colId: editingTarget.col.id });
                            document.getElementById('personnel-resume-input')?.click();
                          }}
                          className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-blue-500/40 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{editingTarget.col.resumeFileName ? 'Change PDF' : 'Upload PDF'}</span>
                        </button>

                        {editingTarget.col.resumePdfId && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePreviewResumeFile(editingTarget.col.resumePdfId, editingTarget.col.resumeFileName)}
                              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-500/40 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteResumeFile(editingTarget.pageId, editingTarget.col.id, editingTarget.col.resumePdfId)}
                              className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-red-500/40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete PDF</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const updated = keyPersonnelPages.map(page => {
                      if (page.id !== editingTarget.pageId) return page;
                      return {
                        ...page,
                        cols: page.cols.map(c => c.id === editingTarget.col.id ? editingTarget.col : c)
                      };
                    });
                    saveAndSetKeyPersonnelPages(updated);
                    setEditingTarget(null);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Personnel Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PAGE 1: EXACT 8.5" x 13" LANDSCAPE (10 COLUMNS) FULL-PAGE PROPORTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(activeTab === 'all' || activeTab === 'page-1') && (
          <div
            className="key-personnel-sheet single-page-paper landscape aspect-[13/8.5] bg-white text-slate-950 font-serif px-6 py-4 border-2 border-slate-900 rounded-xl shadow-2xl max-w-[1248px] w-full h-[816px] mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none box-border mb-8 overflow-hidden"
          >
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 flex flex-col">
                {/* Top Action Bar for Page 1 */}
                <div className="flex items-center justify-between pb-1 print:hidden no-export">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-800 font-serif uppercase tracking-wide">
                      Sheet 1: Key Management & Engineering Personnel
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono border border-slate-300">
                      {keyPersonnelPages[0].cols.length} Columns
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addColumnToPage('page-1')}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow transition cursor-pointer"
                    title="Add a new personnel column to Sheet 1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add Personnel Column</span>
                  </button>
                </div>

                {/* Official Matrix Table - Stretched to eliminate empty white space */}
                <table className="w-full flex-1 border-collapse border-2 border-slate-900 text-slate-950 font-serif text-[9.5px] table-fixed">
                  {/* Dynamic Column Widths for Page 1 */}
                  <colgroup>
                    <col className="w-[24px]" />
                    <col className="w-[120px]" />
                    {keyPersonnelPages[0].cols.map((col) => (
                      <col key={col.id} style={{ width: `${(100 - 14) / keyPersonnelPages[0].cols.length}%` }} />
                    ))}
                  </colgroup>

                  <thead>
                    {/* Title Header Row */}
                    <tr className="h-[24px]">
                      <th
                        colSpan={keyPersonnelPages[0].cols.length + 2}
                        className="border border-slate-900 bg-white py-0.5 px-2 text-center text-[11px] font-bold font-serif uppercase tracking-wider text-slate-950 leading-normal"
                      >
                        MINIMUM REQUIRED APPLICANT FIRM'S KEY PERSONNEL PROPOSED TO BE ASSIGNED IN THE PROJECT
                      </th>
                    </tr>

                    {/* Position Titles Row */}
                    <tr className="h-[44px] bg-white font-serif text-slate-950 font-bold border-b border-slate-900 text-center">
                      <th className="p-0.5 border border-slate-900"></th>
                      <th className="p-0.5 border border-slate-900"></th>
                      {keyPersonnelPages[0].cols.map((col) => (
                        <th
                          key={col.id}
                          className="p-1 border border-slate-900 align-middle text-center text-[8.5px] font-bold leading-tight relative group"
                        >
                          <textarea
                            value={col.position}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'position', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center font-bold text-[8.5px] focus:outline-none focus:bg-blue-50/50 leading-tight resize-none overflow-hidden"
                            rows={col.position.split('\n').length || 2}
                          />

                          {/* Action icons on screen */}
                          <div className="flex flex-col gap-1 mt-1 print:hidden no-export">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingTarget({ pageId: 'page-1', col })}
                                className="px-1.5 py-0.5 text-blue-700 hover:bg-blue-100 rounded text-[7.5px] font-mono border border-blue-300 flex items-center gap-0.5 cursor-pointer"
                                title="Edit Personnel Details"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeColumnFromPage('page-1', col.id)}
                                className="px-1.5 py-0.5 text-red-700 hover:bg-red-100 rounded text-[7.5px] font-mono border border-red-300 flex items-center gap-0.5 cursor-pointer"
                                title="Delete this Personnel Column"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Del</span>
                              </button>
                            </div>

                            {!col.isSpecialColumn && col.resumeFileName && (
                              <div className="flex flex-col gap-0.5 bg-emerald-50 border border-emerald-600 rounded p-1 text-[7.5px] font-mono text-emerald-950 shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewResumeFile(col.resumePdfId, col.resumeFileName)}
                                  className="hover:text-emerald-900 flex items-center justify-center gap-1 font-bold cursor-pointer text-center bg-white rounded py-0.5 border border-emerald-400 truncate"
                                  title={`Click to view attached PDF: ${col.resumeFileName}`}
                                >
                                  <FileCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[65px]">{col.resumeFileName}</span>
                                </button>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveResumeUploadColId({ pageId: 'page-1', colId: col.id });
                                      document.getElementById('personnel-resume-input')?.click();
                                    }}
                                    className="flex-1 py-0.5 text-blue-700 hover:bg-blue-100 rounded border border-blue-300 font-bold text-[7px] flex items-center justify-center gap-0.5 cursor-pointer bg-white"
                                    title="Replace with another PDF"
                                  >
                                    <UploadCloud className="w-2.5 h-2.5" />
                                    <span>Replace</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteResumeFile('page-1', col.id, col.resumePdfId)}
                                    className="flex-1 py-0.5 text-red-700 hover:bg-red-100 rounded border border-red-300 font-bold text-[7px] flex items-center justify-center gap-0.5 cursor-pointer bg-white"
                                    title="Remove / Delete attached PDF"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-900 text-center font-serif text-[9.5px]">
                    {/* Row 1: Name */}
                    <tr className="h-[28px]">
                      <td className="p-0.5 border border-slate-900 font-bold">1</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Name:</td>
                      {keyPersonnelPages[0].cols.map((col) => {
                        if (col.isSpecialColumn) {
                          // SINGLE MERGED VERTICAL SQUARE (rowSpan={17} covers ALL 17 rows from Name to PRC License)
                          return (
                            <td
                              key={col.id}
                              rowSpan={17}
                              className="p-2 border border-slate-900 align-middle font-bold text-[9px] text-center bg-white"
                            >
                              <textarea
                                value={col.specialNote || ''}
                                onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'specialNote', e.target.value)}
                                className="w-full h-full bg-transparent border-none text-center font-bold text-[9px] focus:outline-none resize-none leading-relaxed text-slate-950 flex items-center justify-center"
                                rows={12}
                              />
                            </td>
                          );
                        }
                        return (
                          <td key={col.id} className="p-0.5 border border-slate-900 font-bold text-slate-950">
                            <input
                              type="text"
                              value={col.name}
                              onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'name', e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-center font-bold text-[9.5px] focus:outline-none focus:bg-blue-50/50"
                            />
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 2: Address */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold">2</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Address</td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.address}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'address', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 3: Date of Birth */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold">3</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Date of Birth</td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.dob}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'dob', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 4: Citizenship */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold">4</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Citizenship</td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.citizenship}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'citizenship', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 5: Civil Status */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold">5</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Civil Status</td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.civilStatus}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'civilStatus', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 6: Years of Experience */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold leading-none">6</td>
                      <td className="p-1 border border-slate-900 font-bold text-left leading-tight text-[8.5px]">
                        <div>Years of</div>
                        <div>Experience</div>
                      </td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.yearsExperience || ''}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'yearsExperience', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 7: Education Header Row */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900 font-bold">7</td>
                      <td className="p-1 border border-slate-900 font-bold text-left bg-white text-[9.5px]">
                        Education
                      </td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 bg-white"></td>
                      ))}
                    </tr>

                    {/* Elementary - Name & Location */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">Elementary</div>
                        <div className="text-[7px] not-italic text-slate-600">Name and location of School</div>
                      </td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px] leading-tight">
                          <textarea
                            value={col.education.elementarySchool}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.elementarySchool', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50 leading-tight resize-none"
                            rows={2}
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Elementary - Year Graduated */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-0.5 border border-slate-900 text-left pl-3 text-[8px] text-slate-700">Year graduated</td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.elementaryYear}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.elementaryYear', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* High School - Name & Location */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">High School</div>
                        <div className="text-[7px] not-italic text-slate-600">Name and location of School</div>
                      </td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px] leading-tight">
                          <textarea
                            value={col.education.highSchool}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.highSchool', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50 leading-tight resize-none"
                            rows={2}
                          />
                        </td>
                      ))}
                    </tr>

                    {/* High School - Year Graduated */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-0.5 border border-slate-900 text-left pl-3 text-[8px] text-slate-700">Year graduated</td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.highSchoolYear}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.highSchoolYear', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* College - Name & Location */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">College</div>
                        <div className="text-[7px] not-italic text-slate-600">Name and location of School</div>
                      </td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px] leading-tight">
                          <textarea
                            value={col.education.collegeSchool}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.collegeSchool', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50 leading-tight resize-none font-medium"
                            rows={2}
                          />
                        </td>
                      ))}
                    </tr>

                    {/* College - Year Graduated */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-0.5 border border-slate-900 text-left pl-3 text-[8px] text-slate-700">Year graduated</td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.collegeYear}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.collegeYear', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Post-Graduate - Name & Location */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">Post-Graduate</div>
                        <div className="text-[7px] not-italic text-slate-600">Name and location of School</div>
                      </td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.postGradSchool}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.postGradSchool', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Post-Graduate - Year Graduated */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-0.5 border border-slate-900 text-left pl-3 text-[8px] text-slate-700">Year graduated</td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.postGradYear}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.postGradYear', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Technical Seminars */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">Technical Seminars</div>
                        <div className="text-[6.5px] not-italic text-slate-600">( Use extra sheets, if necessary)</div>
                      </td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[7.5px]">
                          <input
                            type="text"
                            value={col.education.seminars}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'edu.seminars', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[7.5px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 7: PRC License No. */}
                    <tr className="h-[28px]">
                      <td className="p-0.5 border border-slate-900 font-bold">7</td>
                      <td className="p-1 border border-slate-900 font-bold text-left uppercase text-[8.5px] leading-tight">
                        <div>PRC LICENSE</div>
                        <div>No.</div>
                      </td>
                      {keyPersonnelPages[0].cols.filter(c => !c.isSpecialColumn).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.prcLicenseNo}
                            onChange={(e) => updateKeyPersonnelColInPage('page-1', col.id, 'prcLicenseNo', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Page 1 Footer Signature Block */}
              <div className="pt-1.5 pb-0 space-y-0.5">
                <div className="text-[8.5px] font-serif text-slate-900">
                  <p>Notes: Minimum qualification requirement :</p>
                </div>

                <div className="flex items-end justify-between font-serif text-slate-950 pt-1">
                  {/* QR Code */}
                  <div className="flex items-center gap-2">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: `Item ${item.code} — KEY PERSONNEL (Page 1 of 2)`,
                        documentNumber: `EXHIBIT-${item.code.replace(/[^a-zA-Z0-9]/g, '')}-${projectRefNo || '2026-901283'}`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: dateTimeSubmitted || todayStr,
                        documentCategory: 'Technical Eligibility',
                        generatedBy: companyName
                      }}
                      size={38}
                      showCaption={false}
                    />
                    <div className="text-[7.5px] leading-tight">
                      <p className="font-bold">Official GPPB Exhibit</p>
                      <p className="font-mono text-slate-600">Scan QR to verify</p>
                    </div>
                  </div>

                  {/* Authorized Signature Block */}
                  <div className="text-center space-y-0.5 font-serif text-slate-950 min-w-[280px]">
                    <div className="border-b border-slate-900 pb-0.5 mb-0.5 max-w-[260px] mx-auto">
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-center font-bold text-[11px] uppercase tracking-wide focus:outline-none focus:bg-blue-50/50 font-serif text-slate-950"
                        placeholder="NAME OF AUTHORIZED OFFICIAL"
                      />
                    </div>
                    <div className="text-[8px] text-slate-800 italic">
                      Name and Signature of Authorized Official
                    </div>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-center text-[8.5px] focus:outline-none focus:bg-blue-50/50 font-serif text-slate-800 block"
                      placeholder="Title / Designation"
                    />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-center font-bold text-[9px] uppercase focus:outline-none focus:bg-blue-50/50 font-serif text-slate-950 block"
                      placeholder="Company Name"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PAGE 2: EXACT 8.5" x 13" LANDSCAPE (NETWORK TECHNICIANS) FULL-PAGE  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {hasPage2 && (activeTab === 'all' || activeTab === 'page-2') && keyPersonnelPages.find(p => p.id === 'page-2') && (
          <div
            className="key-personnel-sheet single-page-paper landscape aspect-[13/8.5] bg-white text-slate-950 font-serif px-6 py-4 border-2 border-slate-900 rounded-xl shadow-2xl max-w-[1248px] w-full h-[816px] mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none box-border mb-8 overflow-hidden"
          >
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 flex flex-col">
                {/* Top Action Bar for Page 2 */}
                <div className="flex items-center justify-between pb-1 print:hidden no-export">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-800 font-serif uppercase tracking-wide">
                      Sheet 2: Network Technicians & Support Personnel
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono border border-slate-300">
                      {keyPersonnelPages.find(p => p.id === 'page-2')?.cols.length || 0} Columns
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addColumnToPage('page-2')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow transition cursor-pointer"
                      title="Add a new personnel column to Sheet 2"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Personnel Column</span>
                    </button>
                    <button
                      type="button"
                      onClick={deletePage2}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow transition cursor-pointer"
                      title="Delete Sheet 2"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Page 2</span>
                    </button>
                  </div>
                </div>

                {/* Official Matrix Table - Stretched to eliminate empty white space */}
                <table className="w-full flex-1 border-collapse border-2 border-slate-900 text-slate-950 font-serif text-[9.5px] table-fixed">
                  {/* Dynamic Column Widths for Page 2 */}
                  <colgroup>
                    <col className="w-[24px]" />
                    <col className="w-[120px]" />
                    {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                      <col key={col.id} style={{ width: `${(100 - 14) / (keyPersonnelPages.find(p => p.id === 'page-2')?.cols.length || 1)}%` }} />
                    ))}
                  </colgroup>

                  <thead>
                    {/* Title Header Row */}
                    <tr className="h-[24px]">
                      <th
                        colSpan={(keyPersonnelPages.find(p => p.id === 'page-2')?.cols.length || 0) + 2}
                        className="border border-slate-900 bg-white py-0.5 px-2 text-center text-[11px] font-bold font-serif uppercase tracking-wider text-slate-950 leading-normal"
                      >
                        MINIMUM REQUIRED APPLICANT FIRM'S KEY PERSONNEL PROPOSED TO BE ASSIGNED IN THE PROJECT
                      </th>
                    </tr>

                    {/* Position Titles Row */}
                    <tr className="h-[44px] bg-white font-serif text-slate-950 font-bold border-b border-slate-900 text-center">
                      <th className="p-0.5 border border-slate-900"></th>
                      <th className="p-0.5 border border-slate-900"></th>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <th
                          key={col.id}
                          className="p-1 border border-slate-900 align-middle text-center text-[8.5px] font-bold leading-tight relative group"
                        >
                          <textarea
                            value={col.position}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'position', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center font-bold text-[8.5px] focus:outline-none focus:bg-blue-50/50 leading-tight resize-none overflow-hidden"
                            rows={col.position.split('\n').length || 2}
                          />

                          {/* Action icons on screen */}
                          <div className="flex flex-col gap-1 mt-1 print:hidden no-export">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingTarget({ pageId: 'page-2', col })}
                                className="px-1.5 py-0.5 text-blue-700 hover:bg-blue-100 rounded text-[7.5px] font-mono border border-blue-300 flex items-center gap-0.5 cursor-pointer"
                                title="Edit Personnel Details"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeColumnFromPage('page-2', col.id)}
                                className="px-1.5 py-0.5 text-red-700 hover:bg-red-100 rounded text-[7.5px] font-mono border border-red-300 flex items-center gap-0.5 cursor-pointer"
                                title="Delete this Personnel Column"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Del</span>
                              </button>
                            </div>

                            {col.resumeFileName && (
                              <div className="flex flex-col gap-0.5 bg-emerald-50 border border-emerald-600 rounded p-1 text-[7.5px] font-mono text-emerald-950 shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewResumeFile(col.resumePdfId, col.resumeFileName)}
                                  className="hover:text-emerald-900 flex items-center justify-center gap-1 font-bold cursor-pointer text-center bg-white rounded py-0.5 border border-emerald-400 truncate"
                                  title={`Click to view attached PDF: ${col.resumeFileName}`}
                                >
                                  <FileCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[65px]">{col.resumeFileName}</span>
                                </button>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveResumeUploadColId({ pageId: 'page-2', colId: col.id });
                                      document.getElementById('personnel-resume-input')?.click();
                                    }}
                                    className="flex-1 py-0.5 text-blue-700 hover:bg-blue-100 rounded border border-blue-300 font-bold text-[7px] flex items-center justify-center gap-0.5 cursor-pointer bg-white"
                                    title="Replace with another PDF"
                                  >
                                    <UploadCloud className="w-2.5 h-2.5" />
                                    <span>Replace</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteResumeFile('page-2', col.id, col.resumePdfId)}
                                    className="flex-1 py-0.5 text-red-700 hover:bg-red-100 rounded border border-red-300 font-bold text-[7px] flex items-center justify-center gap-0.5 cursor-pointer bg-white"
                                    title="Remove / Delete attached PDF"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-900 text-center font-serif text-[9.5px]">
                    {/* Row 1: Name */}
                    <tr className="h-[28px]">
                      <td className="p-0.5 border border-slate-900 font-bold">1</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Name:</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 font-bold text-slate-950">
                          <textarea
                            value={col.name}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'name', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center font-bold text-[9.5px] focus:outline-none focus:bg-blue-50/50 resize-none leading-tight"
                            rows={col.name.includes('\n') ? 2 : 1}
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 2: Address */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold">2</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Address</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.address}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'address', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 3: Date of Birth */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold">3</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Date of Birth</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.dob}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'dob', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 4: Citizenship */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold">4</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Citizenship</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.citizenship}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'citizenship', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 5: Civil Status */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold">5</td>
                      <td className="p-1 border border-slate-900 font-bold text-left">Civil Status</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.civilStatus}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'civilStatus', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 6: Years of Experience */}
                    <tr className="h-[26px]">
                      <td className="p-0.5 border border-slate-900 font-bold leading-none">6</td>
                      <td className="p-1 border border-slate-900 font-bold text-left leading-tight text-[8.5px]">
                        <div>Years of</div>
                        <div>Experience</div>
                      </td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.yearsExperience || ''}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'yearsExperience', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 7: Education Header Row */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900 font-bold">7</td>
                      <td
                        colSpan={(keyPersonnelPages.find(p => p.id === 'page-2')?.cols.length || 0) + 1}
                        className="p-1 border border-slate-900 font-bold text-left bg-white text-[9.5px]"
                      >
                        Education
                      </td>
                    </tr>

                    {/* Elementary - Name & Location */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">Elementary</div>
                        <div className="text-[7px] not-italic text-slate-600">Name and location of School</div>
                      </td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px] leading-tight">
                          <textarea
                            value={col.education.elementarySchool}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.elementarySchool', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50 leading-tight resize-none"
                            rows={2}
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Elementary - Year Graduated */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-0.5 border border-slate-900 text-left pl-3 text-[8px] text-slate-700">Year graduated</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.elementaryYear}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.elementaryYear', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* High School - Name & Location */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">High School</div>
                        <div className="text-[7px] not-italic text-slate-600">Name and location of School</div>
                      </td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px] leading-tight">
                          <textarea
                            value={col.education.highSchool}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.highSchool', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50 leading-tight resize-none"
                            rows={2}
                          />
                        </td>
                      ))}
                    </tr>

                    {/* High School - Year Graduated */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-0.5 border border-slate-900 text-left pl-3 text-[8px] text-slate-700">Year graduated</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.highSchoolYear}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.highSchoolYear', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* College - Name & Location */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">College</div>
                        <div className="text-[7px] not-italic text-slate-600">Name and location of School</div>
                      </td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px] leading-tight">
                          <textarea
                            value={col.education.collegeSchool}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.collegeSchool', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50 leading-tight resize-none font-medium"
                            rows={2}
                          />
                        </td>
                      ))}
                    </tr>

                    {/* College - Year Graduated */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-0.5 border border-slate-900 text-left pl-3 text-[8px] text-slate-700">Year graduated</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.collegeYear}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.collegeYear', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Post-Graduate - Name & Location */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">Post-Graduate</div>
                        <div className="text-[7px] not-italic text-slate-600">Name and location of School</div>
                      </td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.postGradSchool}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.postGradSchool', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Post-Graduate - Year Graduated */}
                    <tr className="h-[24px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-0.5 border border-slate-900 text-left pl-3 text-[8px] text-slate-700">Year graduated</td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[8px]">
                          <input
                            type="text"
                            value={col.education.postGradYear}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.postGradYear', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[8px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Technical Seminars */}
                    <tr className="h-[30px]">
                      <td className="p-0.5 border border-slate-900"></td>
                      <td className="p-1 border border-slate-900 text-left pl-2 italic text-[8px] leading-tight">
                        <div className="font-semibold text-slate-900">Technical Seminars</div>
                        <div className="text-[6.5px] not-italic text-slate-600">( Use extra sheets, if necessary)</div>
                      </td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[7.5px]">
                          <input
                            type="text"
                            value={col.education.seminars}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'edu.seminars', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[7.5px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Row 7: PRC License No. */}
                    <tr className="h-[28px]">
                      <td className="p-0.5 border border-slate-900 font-bold">7</td>
                      <td className="p-1 border border-slate-900 font-bold text-left uppercase text-[8.5px] leading-tight">
                        <div>PRC LICENSE</div>
                        <div>No.</div>
                      </td>
                      {(keyPersonnelPages.find(p => p.id === 'page-2')?.cols || []).map((col) => (
                        <td key={col.id} className="p-0.5 border border-slate-900 text-[9px]">
                          <input
                            type="text"
                            value={col.prcLicenseNo}
                            onChange={(e) => updateKeyPersonnelColInPage('page-2', col.id, 'prcLicenseNo', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-center text-[9px] focus:outline-none focus:bg-blue-50/50"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Page 2 Footer Signature Block */}
              <div className="pt-1.5 pb-0 space-y-0.5">
                <div className="flex items-end justify-between font-serif text-slate-950 pt-1">
                  {/* QR Code */}
                  <div className="flex items-center gap-2">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: `Item ${item.code} — KEY PERSONNEL (Page 2 of 2)`,
                        documentNumber: `EXHIBIT-${item.code.replace(/[^a-zA-Z0-9]/g, '')}-${projectRefNo || '2026-901283'}`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: dateTimeSubmitted || todayStr,
                        documentCategory: 'Technical Eligibility',
                        generatedBy: companyName
                      }}
                      size={38}
                      showCaption={false}
                    />
                    <div className="text-[7.5px] leading-tight">
                      <p className="font-bold">Official GPPB Exhibit</p>
                      <p className="font-mono text-slate-600">Scan QR to verify</p>
                    </div>
                  </div>

                  {/* Authorized Signature Block */}
                  <div className="text-center space-y-0.5 font-serif text-slate-950 min-w-[280px]">
                    <div className="border-b border-slate-900 pb-0.5 mb-0.5 max-w-[260px] mx-auto">
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-center font-bold text-[11px] uppercase tracking-wide focus:outline-none focus:bg-blue-50/50 font-serif text-slate-950"
                        placeholder="NAME OF AUTHORIZED OFFICIAL"
                      />
                    </div>
                    <div className="text-[8px] text-slate-800 italic">
                      Name and Signature of Authorized Official
                    </div>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-center text-[8.5px] focus:outline-none focus:bg-blue-50/50 font-serif text-slate-800 block"
                      placeholder="Title / Designation"
                    />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-center font-bold text-[9px] uppercase focus:outline-none focus:bg-blue-50/50 font-serif text-slate-950 block"
                      placeholder="Company Name"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Modal Bottom Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between print:hidden no-export shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition shadow flex items-center gap-2 cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? 'Generating PDF...' : 'Export Legal PDF'}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isExporting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition shadow flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Save & Complete Exhibit</span>
          </button>
        </div>
      </div>

      {/* PDF Attachment Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white text-xs font-bold font-mono">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>{previewPdfTitle || 'Personnel Resume PDF Document'}</span>
              </div>
              <button
                onClick={() => { setPreviewPdfUrl(null); setPreviewPdfTitle(''); }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 relative flex flex-col">
              <object
                data={`${previewPdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                type="application/pdf"
                className="w-full h-full border-none bg-slate-900"
              >
                <iframe
                  src={`${previewPdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-none bg-slate-900"
                  title="Attached Resume Preview"
                />
              </object>
            </div>
          </div>
        </div>
      )}

      {/* Complete Attachments & Resume Manager Modal */}
      {isAttachmentsModalOpen && (
        <div className="fixed inset-0 z-[160] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Paperclip className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Key Personnel PDF Resumes Manager</span>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-mono rounded border border-emerald-700/50">
                      {uploadedPersonnelCount} / {totalPersonnelCount} Attached
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    See attachment status, preview documents, replace files, or delete existing attachments.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {uploadedPersonnelCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllAttachments}
                    className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Remove and delete all uploaded PDF files"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All Attached PDFs</span>
                  </button>
                )}
                <button
                  onClick={() => setIsAttachmentsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {keyPersonnelPages.map((page) => (
                <div key={page.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-400 uppercase font-mono tracking-wider">
                      {page.id === 'page-1' ? 'Sheet 1: Key Management & Engineering Personnel' : 'Sheet 2: Network Technicians Crew'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {page.cols.filter(c => !c.isSpecialColumn).map((col) => {
                      const hasPdf = !!col.resumeFileName;
                      return (
                        <div
                          key={col.id}
                          className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                            hasPdf
                              ? 'bg-emerald-950/30 border-emerald-600/50 shadow-sm'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono text-blue-400 block font-bold uppercase">
                                {col.position.replace(/\n/g, ' ')}
                              </span>
                              <span className="text-xs font-bold text-white block">
                                {col.name || 'Unnamed Personnel'}
                              </span>
                            </div>
                            {hasPdf ? (
                              <span className="px-2 py-0.5 bg-emerald-900/80 text-emerald-300 text-[10px] font-mono font-bold rounded border border-emerald-600/60 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>ATTACHED</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-mono rounded border border-slate-700">
                                NO FILE
                              </span>
                            )}
                          </div>

                          {hasPdf ? (
                            <div className="text-[11px] font-mono text-emerald-300/90 truncate bg-black/40 px-2 py-1 rounded border border-emerald-800/40">
                              📄 {col.resumeFileName}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 italic">
                              No PDF resume attached yet
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/60">
                            {hasPdf ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handlePreviewResumeFile(col.resumePdfId, col.resumeFileName)}
                                  className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-500/40 cursor-pointer"
                                  title="View attached document"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveResumeUploadColId({ pageId: page.id, colId: col.id });
                                    document.getElementById('personnel-resume-input')?.click();
                                  }}
                                  className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-500/40 cursor-pointer"
                                  title="Replace with a new PDF"
                                >
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>Replace</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteResumeFile(page.id, col.id, col.resumePdfId)}
                                  className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-red-500/40 cursor-pointer"
                                  title="Permanently delete attached PDF"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveResumeUploadColId({ pageId: page.id, colId: col.id });
                                  document.getElementById('personnel-resume-input')?.click();
                                }}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                              >
                                <FileUp className="w-3.5 h-3.5" />
                                <span>+ Upload PDF Resume</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                All attached PDFs will be automatically merged into the final legal export.
              </span>
              <button
                onClick={() => setIsAttachmentsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KeyPersonnelModal;
