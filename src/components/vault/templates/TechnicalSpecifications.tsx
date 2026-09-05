import React, { useState, useEffect, useMemo } from 'react';
import { Tenant } from '../../../types';
import { buildMergedThreeLayerPdfDataUrl, ExportDocumentUnit, PdfAttachmentSource, generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import { autoFitPageChunks, calculateRowHeight, getAutoFitTypographyClass } from '../../../utils/autoFitEngine';
import { formatDescriptionText } from './SectionViScheduleOfRequirements';
import { savePdfData, loadPdfData } from '../../../utils/vaultIndexedDB';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  FileSignature,
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Type,
  Check,
  AlertCircle,
  Paperclip,
  FileText,
  Upload,
  RefreshCw,
  Tag,
  Sparkles,
  Trash2,
  Lock,
  Eye
} from 'lucide-react';

export interface TechSpecItem {
  id: string;
  itemNo: string;
  specification: string;
  quantity: string;
  compliance: 'Comply' | 'Not Comply';
  brandModel?: string;
}

export interface TechnicalSpecificationsProps {
  item?: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string, projectId?: string) => void;
  onClose?: () => void;
}

const getNowDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

const formatDateTimeDisplay = (raw: string): string => {
  if (!raw) return 'N/A';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return raw;
  }
};

interface RawOpportunityRecord {
  id?: string;
  projectReferenceNumber?: string;
  philgepsRefNo?: string;
  solicitationNumber?: string;
  solicitationNo?: string;
  title?: string;
  biddingProjectTitle?: string;
  areaOfDelivery?: string;
  location?: string;
  procuringEntity?: string | { name?: string };
  submissionDeadlineDatetime?: string;
  submissionDeadlineDate?: string;
  submissionDeadline?: string;
  dateSubmitted?: string;
}

const isRawOpportunityRecord = (value: unknown): value is RawOpportunityRecord => {
  return typeof value === 'object' && value !== null;
};

const getStoredOpportunityRecord = (tenantId: string, opportunityId: string): RawOpportunityRecord | null => {
  const keys = [
    `bidocs_opportunities_${tenantId}`,
    'bidocs_opportunities'
  ];

  for (const key of keys) {
    const saved = localStorage.getItem(key);
    if (!saved) continue;

    try {
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) continue;

      for (const entry of parsed) {
        if (!isRawOpportunityRecord(entry)) continue;
        if (entry.id === opportunityId) {
          return entry;
        }
      }
    } catch {
      // Ignore malformed legacy data and continue searching other keys.
    }
  }

  return null;
};

const DEFAULT_SECTION_VI_ITEMS: TechSpecItem[] = [];

interface PageRow {
  item: TechSpecItem;
  index: number;
}

export const TechnicalSpecifications: React.FC<TechnicalSpecificationsProps> = ({
  item = { id: 'sec-7', code: 'SEC-VII', name: 'Section VII. Technical Specifications' },
  tenant,
  activeProjectRefNo = '',
  activeProjectTitle = '',
  activeProcuringEntity = '',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [isExporting, setIsExporting] = useState(false);
  const [brochurePdfFile, setBrochurePdfFile] = useState<File | null>(null);
  const [brochurePdfName, setBrochurePdfName] = useState<string>('');
  const [brochurePdfDataUrl, setBrochurePdfDataUrl] = useState<string>('');
  const [drawingPdfFile, setDrawingPdfFile] = useState<File | null>(null);
  const [drawingPdfName, setDrawingPdfName] = useState<string>('');
  const [drawingPdfDataUrl, setDrawingPdfDataUrl] = useState<string>('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [fontSizeMode, setFontSizeMode] = useState<'fine' | 'xs' | 'sm'>('xs');
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo);
  const [philgepsRefNo, setPhilgepsRefNo] = useState('');
  const [solicitationNumber, setSolicitationNumber] = useState('');
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle);
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity);
  const [areaOfDelivery, setAreaOfDelivery] = useState('');
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState<string>(getNowDateTimeString());
  const projectScopeKey = projectRefNo || selectedOppId || philgepsRefNo || activeProjectRefNo;

  const [companyName] = useState(tenant?.companyName || 'Bidding Entity Corporate Name');
  const [companyAddress] = useState(tenant?.address || 'Metro Manila, Philippines');
  const [signatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Signatory Name');
  const [signatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'President / General Manager');

  const [items, setItems] = useState<TechSpecItem[]>([]);

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);
    if (activeProjectRefNo) {
      const match = list.find((project) => project.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setPhilgepsRefNo(match.refNo);
        setSolicitationNumber(match.solicitationNo || 'SOL-2026-001');
        setProjectTitle(match.title);
        setProcuringEntity(match.procuringEntity);
        if (match.dateTimeSubmitted) {
          setDateTimeSubmitted(match.dateTimeSubmitted);
        }
        return;
      }
      setSelectedOppId('');
      setProjectRefNo(activeProjectRefNo);
      setPhilgepsRefNo(activeProjectRefNo);
      setSolicitationNumber('SOL-2026-001');
      setProjectTitle(activeProjectTitle || 'Target Bidding Project');
      setProcuringEntity(activeProcuringEntity || '');
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setPhilgepsRefNo(first.refNo);
      setSolicitationNumber(first.solicitationNo || 'SOL-2026-001');
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
      if (first.dateTimeSubmitted) {
        setDateTimeSubmitted(first.dateTimeSubmitted);
      }
    } else {
      setSelectedOppId('');
      setProjectRefNo('');
      setPhilgepsRefNo('');
      setSolicitationNumber('');
      setProjectTitle('');
      setProcuringEntity('');
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  const handleSelectProject = (oppIdOrRef: string) => {
    const found = oppProjects.find((p) => p.id === oppIdOrRef || p.refNo === oppIdOrRef);
    if (found) {
      setSelectedOppId(found.id);
      setProjectRefNo(found.refNo);
      setPhilgepsRefNo(found.refNo);
      setSolicitationNumber(found.solicitationNo || 'SOL-2026-001');
      setProjectTitle(found.title);
      setProcuringEntity(found.procuringEntity);
      if (found.dateTimeSubmitted) {
        setDateTimeSubmitted(found.dateTimeSubmitted);
      }
    }
  };

  useEffect(() => {
    if (!tenant?.id || !selectedOppId) return;

    const record = getStoredOpportunityRecord(tenant.id, selectedOppId);
    if (!record) return;
    const selectedProject = oppProjects.find((project) => project.id === selectedOppId);

    const internalProjectRef = record.projectReferenceNumber || record.philgepsRefNo || activeProjectRefNo;
    const externalPhilgepsRef = record.philgepsRefNo || record.projectReferenceNumber || internalProjectRef;
    const storageProjectRef = selectedProject?.refNo || externalPhilgepsRef || internalProjectRef || activeProjectRefNo;
    const projectName = record.title || record.biddingProjectTitle || activeProjectTitle;
    const procuringEntityValue = typeof record.procuringEntity === 'string'
      ? record.procuringEntity
      : record.procuringEntity?.name || activeProcuringEntity;
    const areaValue = record.areaOfDelivery || record.location || '';
    const submissionValue = record.submissionDeadlineDatetime || record.submissionDeadlineDate || record.submissionDeadline || record.dateSubmitted || '';

    setProjectRefNo(storageProjectRef);
    setPhilgepsRefNo(externalPhilgepsRef || '');
    setSolicitationNumber(record.solicitationNumber || record.solicitationNo || 'SOL-2026-001');
    setProjectTitle(projectName);
    setProcuringEntity(procuringEntityValue);
    setAreaOfDelivery(areaValue);
    if (submissionValue) {
      setDateTimeSubmitted(submissionValue.substring(0, 16));
    }
  }, [selectedOppId, tenant?.id, oppProjects, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (!projectScopeKey) {
      setItems([]);
      return;
    }
    const tenantKey = tenant?.id || 'default';
    
    const candidateSecViKeys = [
      `bidocs_sec_vi_${tenantKey}_${projectScopeKey}`,
      selectedOppId ? `bidocs_sec_vi_${tenantKey}_${selectedOppId}` : '',
      projectRefNo ? `bidocs_sec_vi_${tenantKey}_${projectRefNo}` : ''
    ].filter(Boolean);

    const candidateTechKeys = [
      `bidocs_tech_specs_${tenantKey}_${projectScopeKey}`,
      selectedOppId ? `bidocs_tech_specs_${tenantKey}_${selectedOppId}` : '',
      projectRefNo ? `bidocs_tech_specs_${tenantKey}_${projectRefNo}` : ''
    ].filter(Boolean);

    let baseItems: TechSpecItem[] = [];
    let secViLoaded = false;

    for (const key of candidateSecViKeys) {
      const savedSecVi = localStorage.getItem(key);
      if (savedSecVi !== null) {
        try {
          const parsedVi = JSON.parse(savedSecVi);
          if (Array.isArray(parsedVi)) {
            secViLoaded = true;
            baseItems = parsedVi.map((viItem: any, idx: number) => ({
              id: viItem.id || String(idx + 1),
              itemNo: String(idx + 1),
              specification: viItem.description || '',
              quantity: viItem.quantity || '1 unit',
              compliance: 'Comply' as const,
              brandModel: ''
            }));
            break;
          }
        } catch (e) { }
      }
    }

    for (const key of candidateTechKeys) {
      const savedTechSpecs = localStorage.getItem(key);
      if (savedTechSpecs !== null) {
        try {
          const parsedTech = JSON.parse(savedTechSpecs);
          if (Array.isArray(parsedTech)) {
            if (!secViLoaded || baseItems.length === 0) {
              baseItems = parsedTech;
            } else {
              const techById = new Map(parsedTech.map((entry: any, idx: number) => [entry.id || String(idx + 1), entry]));
              baseItems = baseItems.map((it, idx) => {
                const matched = techById.get(it.id) || parsedTech[idx];
                if (matched) {
                  return {
                    ...it,
                    compliance: matched.compliance || it.compliance,
                    brandModel: matched.brandModel !== undefined ? matched.brandModel : it.brandModel
                  };
                }
                return it;
              });
            }
            break;
          }
        } catch (e) { }
      }
    }

    setItems(baseItems);

    // Load persisted brochure and drawing attachments from IndexedDB / localStorage
    const loadAttachments = async () => {
      try {
        const savedBrochureName = localStorage.getItem(`tech_specs_brochure_name_${tenantKey}_${projectScopeKey}`) || '';
        if (savedBrochureName) {
          setBrochurePdfName(savedBrochureName);
          const bData = await loadPdfData(`tech_specs_brochure_${tenantKey}_${projectScopeKey}`);
          if (bData) setBrochurePdfDataUrl(bData);
        } else {
          setBrochurePdfName('');
          setBrochurePdfDataUrl('');
          setBrochurePdfFile(null);
        }

        const savedDrawingName = localStorage.getItem(`tech_specs_drawing_name_${tenantKey}_${projectScopeKey}`) || '';
        if (savedDrawingName) {
          setDrawingPdfName(savedDrawingName);
          const dData = await loadPdfData(`tech_specs_drawing_${tenantKey}_${projectScopeKey}`);
          if (dData) setDrawingPdfDataUrl(dData);
        } else {
          setDrawingPdfName('');
          setDrawingPdfDataUrl('');
          setDrawingPdfFile(null);
        }
      } catch (err) {
        console.warn('Failed to load Section VII attachments from IndexedDB:', err);
      }
    };
    loadAttachments();
  }, [projectScopeKey, tenant?.id]);

  const saveSharedItems = (newItems: TechSpecItem[]) => {
    setItems(newItems);
    const tenantKey = tenant?.id || 'default';
    const keys = new Set([
      projectScopeKey ? `bidocs_tech_specs_${tenantKey}_${projectScopeKey}` : '',
      selectedOppId ? `bidocs_tech_specs_${tenantKey}_${selectedOppId}` : '',
      projectRefNo ? `bidocs_tech_specs_${tenantKey}_${projectRefNo}` : ''
    ]);
    const json = JSON.stringify(newItems);
    keys.forEach(k => {
      if (k) {
        try {
          localStorage.setItem(k, json);
        } catch (err) {
          console.warn('localStorage write failed:', err);
        }
      }
    });
  };

  const handleFieldChange = (index: number, field: keyof TechSpecItem, value: any) => {
    const updated = items.map((it, idx) => (idx === index ? { ...it, [field]: value } : it));
    saveSharedItems(updated);
  };

  const handleComplyClick = (index: number) => {
    const updated = items.map((it, idx) =>
      idx === index ? { ...it, compliance: 'Comply' as const } : it
    );
    saveSharedItems(updated);
  };

  const handleNotComplyClick = (index: number) => {
    const updated = items.map((it, idx) =>
      idx === index ? { ...it, compliance: 'Not Comply' as const } : it
    );
    saveSharedItems(updated);
  };

  const handleSyncWithSectionVi = () => {
    if (!projectScopeKey) return;
    const tenantKey = tenant?.id || 'default';
    const secViKey = `bidocs_sec_vi_${tenantKey}_${projectScopeKey}`;
    const savedSecVi = localStorage.getItem(secViKey);

    if (savedSecVi) {
      try {
        const parsedVi = JSON.parse(savedSecVi);
        if (Array.isArray(parsedVi) && parsedVi.length > 0) {
          const currentById = new Map(items.map((existing, idx) => [existing.id || String(idx + 1), existing]));
          const synced = parsedVi.map((viItem: any, idx: number) => ({
            id: viItem.id || String(idx + 1),
            itemNo: String(idx + 1),
            specification: viItem.description || '',
            quantity: viItem.quantity || '1 unit',
            compliance: (currentById.get(viItem.id || String(idx + 1))?.compliance === 'Not Comply' ? 'Not Comply' as const : 'Comply' as const),
            brandModel: currentById.get(viItem.id || String(idx + 1))?.brandModel || ''
          }));
          saveSharedItems(synced);
          return;
        }
      } catch (e) { }
    }
    saveSharedItems(DEFAULT_SECTION_VI_ITEMS);
  };

  const handleBrochurePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF brochure document.');
      return;
    }
    setBrochurePdfName(file.name);
    setBrochurePdfFile(file);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setBrochurePdfDataUrl(dataUrl);
      const tenantKey = tenant?.id || 'default';
      try {
        await savePdfData(`tech_specs_brochure_${tenantKey}_${projectScopeKey}`, dataUrl);
        if (selectedOppId) await savePdfData(`tech_specs_brochure_${tenantKey}_${selectedOppId}`, dataUrl);
        if (projectRefNo) await savePdfData(`tech_specs_brochure_${tenantKey}_${projectRefNo}`, dataUrl);
        localStorage.setItem(`tech_specs_brochure_name_${tenantKey}_${projectScopeKey}`, file.name);
      } catch (err) {
        console.warn('Failed to save brochure to IndexedDB:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrawingPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF drawing document.');
      return;
    }
    setDrawingPdfName(file.name);
    setDrawingPdfFile(file);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setDrawingPdfDataUrl(dataUrl);
      const tenantKey = tenant?.id || 'default';
      try {
        await savePdfData(`tech_specs_drawing_${tenantKey}_${projectScopeKey}`, dataUrl);
        if (selectedOppId) await savePdfData(`tech_specs_drawing_${tenantKey}_${selectedOppId}`, dataUrl);
        if (projectRefNo) await savePdfData(`tech_specs_drawing_${tenantKey}_${projectRefNo}`, dataUrl);
        localStorage.setItem(`tech_specs_drawing_name_${tenantKey}_${projectScopeKey}`, file.name);
      } catch (err) {
        console.warn('Failed to save drawing to IndexedDB:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBrochurePdf = async () => {
    setBrochurePdfFile(null);
    setBrochurePdfName('');
    setBrochurePdfDataUrl('');
    const tenantKey = tenant?.id || 'default';
    localStorage.removeItem(`tech_specs_brochure_name_${tenantKey}_${projectScopeKey}`);
    try {
      await savePdfData(`tech_specs_brochure_${tenantKey}_${projectScopeKey}`, '');
      if (selectedOppId) await savePdfData(`tech_specs_brochure_${tenantKey}_${selectedOppId}`, '');
      if (projectRefNo) await savePdfData(`tech_specs_brochure_${tenantKey}_${projectRefNo}`, '');
    } catch (e) { }
  };

  const handleRemoveDrawingPdf = async () => {
    setDrawingPdfFile(null);
    setDrawingPdfName('');
    setDrawingPdfDataUrl('');
    const tenantKey = tenant?.id || 'default';
    localStorage.removeItem(`tech_specs_drawing_name_${tenantKey}_${projectScopeKey}`);
    try {
      await savePdfData(`tech_specs_drawing_${tenantKey}_${projectScopeKey}`, '');
      if (selectedOppId) await savePdfData(`tech_specs_drawing_${tenantKey}_${selectedOppId}`, '');
      if (projectRefNo) await savePdfData(`tech_specs_drawing_${tenantKey}_${projectRefNo}`, '');
    } catch (e) { }
  };

  const handlePrint = () => {
    window.print();
  };

  const buildFinalPdfDataUrl = async (): Promise<string | undefined> => {
    const containerElem = document.getElementById('section-vii-pages-container') || document.getElementById('section-vii-paper');
    const bSource = brochurePdfFile || brochurePdfDataUrl;
    const dSource = drawingPdfFile || drawingPdfDataUrl;
    const attachmentSources: PdfAttachmentSource[] = [bSource, dSource].filter(Boolean) as PdfAttachmentSource[];

    if (!containerElem && attachmentSources.length === 0) {
      return undefined;
    }

    const units: ExportDocumentUnit[] = [];
    if (containerElem) {
      units.push({
        title: item.name,
        formElement: containerElem,
        fileSource: attachmentSources[0]
      });
    } else if (attachmentSources[0]) {
      units.push({
        title: item.name,
        fileSource: attachmentSources[0]
      });
    }

    if (attachmentSources[1]) {
      units.push({
        title: `${item.name} Attached Drawing`,
        fileSource: attachmentSources[1]
      });
    }

    return await buildMergedThreeLayerPdfDataUrl(
      units,
      `${philgepsRefNo || projectRefNo}_Section_VII_Technical_Specifications_${todayStr}.pdf`
    );
  };

  const handleViewPdf = async () => {
    setIsPreviewing(true);
    try {
      const dataUrl = await buildFinalPdfDataUrl();
      if (dataUrl) {
        setPreviewPdfUrl(dataUrl);
      } else {
        alert('Could not generate Section VII PDF preview.');
      }
    } catch (err) {
      console.error('[SectionVII] View PDF generation error:', err);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const fileName = `${philgepsRefNo || projectRefNo}_Section_VII_Technical_Specifications_${todayStr}.pdf`;
      const finalPdfDataUrl = await buildFinalPdfDataUrl();
      if (finalPdfDataUrl) {
        const link = document.createElement('a');
        link.href = finalPdfDataUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    const cleanProj = (philgepsRefNo || projectRefNo || 'PRJ').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanProj}_Technical_Specifications_${todayStr}.csv`;

    let csvContent = '\uFEFF';
    csvContent += `"SECTION VII. TECHNICAL SPECIFICATIONS"\n`;
    csvContent += `"Company Name:","${companyName.replace(/"/g, '""')}"\n`;
    csvContent += `"Company Address:","${companyAddress.replace(/"/g, '""')}"\n`;
    csvContent += `"PhilGEPS Ref. No.:","${(philgepsRefNo || projectRefNo).replace(/"/g, '""')}"\n`;
    csvContent += `"Solicitation No.:","${solicitationNumber.replace(/"/g, '""')}"\n`;
    csvContent += `"Project Title:","${projectTitle.replace(/"/g, '""')}"\n`;
    csvContent += `"Procuring Entity:","${procuringEntity.replace(/"/g, '""')}"\n`;
    csvContent += `"Submission Date & Time:","${formatDateTimeDisplay(dateTimeSubmitted)}"\n`;
    if (drawingPdfName) {
      csvContent += `"Attached Drawing PDF:","${drawingPdfName.replace(/"/g, '""')}"\n`;
    }
    csvContent += `\n`;

    csvContent += `"Item","Maximum Quantity","Technical Specification / Scope of Work","Brand & Model Offered","Statement of Compliance"\n`;

    items.forEach((it, idx) => {
      const itemNum = `"${idx + 1}"`;
      const qty = `"${(it.quantity || '').replace(/"/g, '""')}"`;
      const spec = `"${(it.specification || '').replace(/"/g, '""')}"`;
      const bm = `"${(it.brandModel || 'N/A').replace(/"/g, '""')}"`;
      const compText = `"${(formatFullComplianceText(it)).replace(/"/g, '""')}"`;
      csvContent += `${itemNum},${qty},${spec},${bm},${compText}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    setIsExporting(true);
    let dataUrl: string | undefined = undefined;
    try {
      dataUrl = await buildFinalPdfDataUrl();
      if (dataUrl) {
        const tenantKey = tenant?.id || 'default';
        try {
          await savePdfData(`tech_specs_${tenantKey}_${projectScopeKey}`, dataUrl);
          if (selectedOppId) await savePdfData(`tech_specs_${tenantKey}_${selectedOppId}`, dataUrl);
          if (projectRefNo) await savePdfData(`tech_specs_${tenantKey}_${projectRefNo}`, dataUrl);
        } catch (dbErr) {
          console.warn('Failed to cache Section VII in IndexedDB:', dbErr);
        }
      }
      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, item.name, philgepsRefNo || projectRefNo, projectTitle, selectedOppId);
      }
    } catch (error) {
      console.error('Failed to generate Technical Specifications PDF:', error);
      if (onSaveAndComplete) {
        onSaveAndComplete(dataUrl, item.name, philgepsRefNo || projectRefNo, projectTitle, selectedOppId);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const formatFullComplianceText = (it: TechSpecItem): string => {
    return it.compliance;
  };

  const totalCharactersInDoc = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.specification || '').length + (it.brandModel || '').length, 0);
  }, [items]);

  const autoTypographyClass = useMemo(() => {
    return getAutoFitTypographyClass(totalCharactersInDoc, items.length);
  }, [totalCharactersInDoc, items.length]);

  const getTableFontSizeClass = () => {
    if (fontSizeMode === 'fine') return 'text-[9.5px] leading-tight';
    if (fontSizeMode === 'xs') return autoTypographyClass;
    return 'text-xs leading-normal';
  };

  // --- DYNAMIC AUTO-FIT PAGE-PACKING ENGINE ---
  // Automatically measures and packs all information inside the minimum necessary number of pages with zero empty space
  const pageChunks = useMemo<PageRow[][]>(() => {
    const indexedItems: PageRow[] = items.map((it, idx) => ({ item: it, index: idx }));
    return autoFitPageChunks(
      indexedItems,
      (row) => {
        const specHeight = calculateRowHeight(row.item.specification || '', 60, 13.5, 8, 22);
        const bmHeight = calculateRowHeight(row.item.brandModel || '', 25, 13.5, 8, 22);
        return Math.max(specHeight, bmHeight, 22);
      },
      {
        orientation: 'portrait',
        columnCharWidth: 60,
        headerHeightPx: 170,
        footerHeightPx: 260,
        runningFooterPx: 30
      }
    );
  }, [items]);

  const totalPages = pageChunks.length;

  const pagesList = pageChunks.map((chunk, pIdx) => (
    <div
      key={`sec-7-page-${pIdx}`}
      id={pIdx === 0 ? 'section-vii-paper' : `section-vii-paper-p${pIdx + 1}`}
      className="single-page-paper print-document-sheet portrait aspect-[8.5/13] bg-white text-black p-6 border-2 border-slate-900 shadow-2xl mx-auto rounded-none w-[816px] min-h-[1248px] max-w-[816px] flex flex-col justify-between font-serif mb-8 box-border relative text-slate-950"
    >
      <div>
        {/* COMPANY & PROJECT HEADER BLOCK (PAGE 1 ONLY) */}
        {pIdx === 0 ? (
          <div className="mb-3 pb-2.5 border-b-2 border-slate-900 font-serif">
            {/* Centered Company Name Header */}
            <div className="text-center pb-2 border-b border-slate-300">
              <h1 className="text-lg font-bold uppercase tracking-wider text-black font-serif">
                {companyName}
              </h1>
              <p className="text-xs text-slate-700 font-serif font-semibold mt-0.5 uppercase tracking-wide">
                {companyAddress}
              </p>
            </div>

            {/* 4-Field Project Information Grid */}
            <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-serif text-black">
              <div>
                <span className="font-bold">Project Name: </span>
                <span className="font-semibold text-slate-900">{projectTitle || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold">Project REF No.: </span>
                <span className="font-mono font-semibold text-blue-950">{philgepsRefNo || projectRefNo || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold">Procuring Entity: </span>
                <span className="text-slate-900">{procuringEntity || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold">Submission Date & Time: </span>
                <span className="font-mono font-semibold text-blue-950">{formatDateTimeDisplay(dateTimeSubmitted)}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* FORM TITLE (PAGE 1 ONLY) */}
        {pIdx === 0 ? (
          <div className="mb-3 text-center">
            <h2 className="text-lg font-bold uppercase tracking-wide text-black border-b border-black inline-block pb-0.5 font-serif">
              Section VII. Technical Specifications
            </h2>
            <p className="text-[10px] font-mono text-slate-700 uppercase mt-0.5 font-bold">
              (MANDATORY TECHNICAL SPECIFICATIONS & STATEMENT OF COMPLIANCE)
            </p>
            {(brochurePdfName || drawingPdfName) && (
              <div className="mt-1 text-xs font-serif italic text-purple-950 font-semibold space-y-0.5">
                {brochurePdfName && <div>📎 Attached Brochure PDF: {brochurePdfName}</div>}
                {drawingPdfName && <div>📎 Attached Drawing PDF: {drawingPdfName}</div>}
              </div>
            )}
          </div>
        ) : null}

        {/* ITEMS TABLE */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs font-serif table-fixed">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[8%]" />
              <col className="w-[58%]" />
              <col className="w-[28%]" />
            </colgroup>
            {pIdx === 0 ? (
              <thead>
                <tr className="bg-slate-200 border-b border-black text-black font-bold text-center uppercase tracking-wider text-[11px]">
                  <th className="border border-black px-1 py-1 w-[6%]">Item No.</th>
                  <th className="border border-black px-1.5 py-1.5 w-[8%]">Qty</th>
                  <th className="border border-black px-3 py-1.5 text-center w-[58%]">Technical Specifications / Scope of Work</th>
                  <th className="border border-black px-3 py-1.5 text-left w-[28%]">
                    <div className="font-bold text-black">Statement of Compliance</div>
                    <div className="text-[8.5px] font-serif leading-tight text-slate-800 font-normal normal-case mt-0.5 p-1 bg-amber-50/70 rounded border border-amber-200/80 break-words">
                      [Bidders must state <strong>"Comply"</strong> or <strong>"Not Comply"</strong> against each individual parameter supported by evidence.]
                    </div>
                  </th>
                </tr>
              </thead>
            ) : (
              <thead>
                <tr className="bg-slate-200 border-b border-black text-black font-bold text-center uppercase tracking-wider text-[10px]">
                  <th className="border border-black px-1 py-1 w-[6%]">Item No.</th>
                  <th className="border border-black px-1.5 py-1 w-[8%]">Qty</th>
                  <th className="border border-black px-3 py-1 text-center w-[58%]">Technical Specifications / Scope of Work (Continuation)</th>
                  <th className="border border-black px-3 py-1 text-center w-[28%]">Statement of Compliance</th>
                </tr>
              </thead>
            )}
            <tbody>
              {chunk.map(({ item: rowItem, index: itemIdx }) => (
                <tr key={rowItem.id || `tech-spec-${itemIdx}`} className="border-b border-black hover:bg-slate-50/50 transition-colors">
                  {/* 1. Item No. (Read-Only) */}
                  <td className="border border-black px-1.5 py-1.5 text-center font-serif font-bold align-top">
                    <span className="block pt-0.5">{itemIdx + 1}</span>
                  </td>

                  {/* 2. Maximum Quantity (Strictly Mirrored from Section VI - Read-Only) */}
                  <td className="border border-black px-1.5 py-1.5 font-serif text-center align-top break-words">
                    <div className={`font-serif text-black text-center pt-0.5 font-normal break-words ${getTableFontSizeClass()}`}>
                      {rowItem.quantity || ''}
                    </div>
                  </td>

                  {/* 3. Technical Specifications (Strictly Mirrored from Section VI - Read-Only) */}
                  <td className="border border-black px-3 py-1.5 font-serif align-top break-words">
                    <div className={`font-serif text-black pt-0.5 whitespace-pre-wrap font-normal break-words [overflow-wrap:break-word] leading-snug ${getTableFontSizeClass()}`}>
                      {formatDescriptionText(rowItem.specification || '')}
                    </div>
                  </td>

                  {/* 4. Statement of Compliance (Editable: Brand/Model & Comply Toggle) */}
                  <td className="border border-black px-3 py-1.5 font-serif align-top break-words bg-emerald-50/15">
                    <div className="space-y-1.5">
                      {!isExporting && (
                        <div className="flex items-center gap-1.5 print:hidden no-export">
                          <button
                            type="button"
                            onClick={() => handleComplyClick(itemIdx)}
                            className={`px-2.5 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${rowItem.compliance === 'Comply'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Comply</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNotComplyClick(itemIdx)}
                            className={`px-2.5 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${rowItem.compliance === 'Not Comply'
                                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                          >
                            <AlertCircle className="w-3 h-3 stroke-[3]" />
                            <span>Not Comply</span>
                          </button>
                        </div>
                      )}

                      {!isExporting && rowItem.compliance === 'Comply' && (
                        <div className="space-y-0.5 print:hidden no-export">
                          <label className="text-[9.5px] font-mono font-bold text-slate-700 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-blue-600" />
                            <span>Brand & Model Offered (Optional):</span>
                          </label>
                          <textarea
                            rows={1}
                            value={rowItem.brandModel || ''}
                            onChange={(e) => handleFieldChange(itemIdx, 'brandModel', e.target.value)}
                            placeholder="e.g. Cisco Catalyst 9300 / Dell PowerEdge R750"
                            className="w-full bg-blue-50/50 text-blue-950 border border-blue-300 rounded p-1 text-xs font-serif outline-none focus:border-blue-500 font-semibold resize-none whitespace-pre-wrap break-words"
                          />
                        </div>
                      )}

                      <div className={`${!isExporting ? 'hidden print:block' : 'block'} font-serif text-black text-xs leading-relaxed`}>
                        <div className={`font-bold ${rowItem.compliance === 'Comply' ? 'text-emerald-950' : 'text-red-950'}`}>
                          Statement: {rowItem.compliance}
                        </div>
                        {rowItem.compliance === 'Comply' && rowItem.brandModel && (
                          <div className="text-slate-900 mt-0.5 whitespace-pre-wrap break-words font-medium">
                            {formatDescriptionText(rowItem.brandModel)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Statutory *** NOTHING FOLLOWS *** Security Seal (Final Page after items) */}
              {pIdx === totalPages - 1 && (
                <tr className="border-b border-black text-center font-bold tracking-widest text-[10.5px] bg-slate-100/60 uppercase text-slate-800">
                  <td colSpan={4} className="py-1">
                    *** NOTHING FOLLOWS ***
                  </td>
                </tr>
              )}
            </tbody>

            {/* SUMMARY ROW (FINAL PAGE ONLY) */}
            {pIdx === totalPages - 1 && (
              <tfoot className="border-t-2 border-black font-serif bg-slate-100/90">
                <tr className="border-b border-black">
                  <td colSpan={4} className="border border-black px-3 py-1.5 font-serif text-xs text-right">
                    <span className="uppercase tracking-wider text-black font-bold font-serif text-xs">
                      TOTAL SPECIFICATION ITEMS: {items.length}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Document Footer: Signatory Block (Final Page Only) + Running Page Footer on EVERY Page */}
      <div>
        {/* Signatory Block & GPPB QR Code (Final Page Only) */}
        {pIdx === totalPages - 1 && (
          <div className="mt-6 pt-3 border-t border-slate-300 flex items-end justify-between text-xs font-serif signatory-block mb-3">
            <div>
              <p className="font-bold text-black uppercase">{companyName}</p>
              <div className="mt-6 border-b border-black w-64"></div>
              <p className="font-bold text-black mt-1 uppercase">{signatoryName}</p>
              <p className="text-slate-700">{signatoryTitle}</p>
            </div>

            <div className="text-right flex flex-col items-end">
              <DocumentQrCode
                details={{
                  companyName: companyName,
                  documentName: 'Section VII. Technical Specifications',
                  documentNumber: `SEC-VII-${philgepsRefNo || projectRefNo || '2026-901283'}`,
                  projectTitle: projectTitle,
                  projectRefNo: philgepsRefNo || projectRefNo || 'N/A',
                  procuringEntity: procuringEntity,
                  dateTimeSubmitted: formatDateTimeDisplay(dateTimeSubmitted),
                  documentCategory: 'Technical Eligibility',
                  generatedBy: companyName
                }}
                size={80}
                showCaption={false}
              />
              <span className="text-[9px] font-mono text-slate-600 uppercase mt-1">
                VERIFIED GPPB DOC • {philgepsRefNo || projectRefNo || 'N/A'}
              </span>
            </div>
          </div>
        )}

        {/* Running Page Footer (Rendered on EVERY Page) */}
        <div className="mt-4 pt-2 border-t-2 border-black flex items-center justify-between text-[8.5pt] font-mono text-black shrink-0">
          <div className="font-bold uppercase">{companyName}</div>
          <div>SECTION VII TECHNICAL SPECIFICATIONS • REF: {philgepsRefNo || projectRefNo || 'N/A'}</div>
          <div className="font-bold">PAGE {pIdx + 1} OF {totalPages}</div>
        </div>
      </div>
    </div>
  ));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, button, .print\\:hidden, .no-print, .no-export, .proof-column, .actions-column, .sticky {
            display: none !important;
          }
          html, body, #root, .fixed, .backdrop-blur-md, .bg-slate-900, .bg-slate-950 {
            position: static !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }
          .single-page-paper {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: relative !important;
            width: 8.5in !important;
            max-width: 8.5in !important;
            height: 13in !important;
            max-height: 13in !important;
            min-height: 13in !important;
            margin: 0 !important;
            padding: 0.4in 0.45in !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .single-page-paper:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
        .single-page-paper,
        .single-page-paper * {
          box-sizing: border-box;
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">

        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Section VII. Technical Specifications</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  Legal Portrait Form (8.5" × 13")
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xl">
                100% Synced with Section VI • Up to 300MB Brochure & Drawing Support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleViewPdf}
              disabled={isPreviewing || isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition shadow flex items-center gap-1.5 cursor-pointer"
              title="View compiled PDF document including all attached brochure and drawing pages"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isPreviewing ? 'Loading PDF...' : 'View PDF'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 transition shadow flex items-center gap-1.5 border border-emerald-500/40 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting PDF...' : 'Export to PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pages</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 space-y-4 print:p-0 print:bg-white">

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 print:hidden no-export">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 text-blue-300">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>Target Bidding Project:</span>
                  </label>
                  {projectRefNo && (
                    <span className="text-[10px] text-emerald-400 font-bold font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Strict Isolation Active ({projectRefNo})</span>
                    </span>
                  )}
                </div>
                <select
                  value={selectedOppId || projectRefNo}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer"
                >
                  {oppProjects.length === 0 ? (
                    <option value="">-- No Saved Projects in Opportunity Finder --</option>
                  ) : (
                    <>
                      <option value="">-- Select Active Bidding Opportunity / Project --</option>
                      {oppProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-4 sm:pt-0 shrink-0">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 px-1.5 flex items-center gap-1 text-[11px]">
                    <Type className="w-3.5 h-3.5 text-blue-400" /> Font Size:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('fine')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${fontSizeMode === 'fine' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    9pt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('xs')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${fontSizeMode === 'xs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    10pt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeMode('sm')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${fontSizeMode === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    11pt
                  </button>
                </div>

                <button
                  onClick={handleSyncWithSectionVi}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sync with Section VI</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
              <span>
                <strong>100% Automatic Synchronization:</strong> Section VII item descriptions and quantities automatically sync from Section VI Schedule of Requirements.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-purple-400" />
                  <span>Optional PDF Attachments (Up to 300MB Native Vector PDFs)</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Upload brochure and drawing PDFs. They are preserved losslessly as native vector pages and appended directly in the exported PDF.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {brochurePdfName ? (
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs font-mono text-blue-300">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate max-w-[180px] font-semibold">{brochurePdfName}</span>
                    <button type="button" onClick={handleRemoveBrochurePdf} className="p-1 hover:text-red-400 transition cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer shadow transition flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Brochure PDF</span>
                    <input type="file" accept="application/pdf" onChange={handleBrochurePdfUpload} className="hidden" />
                  </label>
                )}

                {drawingPdfName ? (
                  <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs font-mono text-purple-300">
                    <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="truncate max-w-[180px] font-semibold">{drawingPdfName}</span>
                    <button type="button" onClick={handleRemoveDrawingPdf} className="p-1 hover:text-red-400 transition cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 cursor-pointer shadow transition flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Drawing PDF</span>
                    <input type="file" accept="application/pdf" onChange={handleDrawingPdfUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

          </div>

          {/* PAGES CONTAINER (PORTRAIT LEGAL 8.5" x 13") */}
          <div id="section-vii-pages-container" className="flex flex-col items-center gap-8 print:gap-0">
            {pagesList}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 shrink-0 print:hidden no-export">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Class A Technical Exhibit — Legal Portrait Standard (8.5" × 13")</span>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:from-blue-500 disabled:opacity-50 transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isExporting ? 'Saving PDF...' : 'Save & Complete Technical Specifications'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* FULL-SCREEN PDF VIEWER MODAL (MATCHES SLCC & ONGOING CONTRACTS) */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Section VII. Technical Specifications — Merged Document Preview
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Includes Statement Table + All Attached Brochure & Drawing PDF Pages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  download={`${philgepsRefNo || projectRefNo}_Section_VII_Technical_Specifications_${todayStr}.pdf`}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Close PDF Viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2 overflow-hidden">
              <iframe
                src={previewPdfUrl}
                className="w-full h-full rounded-xl border border-slate-800 bg-white"
                title="Section VII PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalSpecifications;