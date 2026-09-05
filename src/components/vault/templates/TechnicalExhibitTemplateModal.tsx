import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import KeyPersonnelModal from './KeyPersonnelModal';
import EquipmentListModal from './EquipmentListModal';
import OrganizationalChartModal from './organizationchart';
import html2canvas from 'html2canvas';
import {
  X,
  Printer,
  Download,
  Building2,
  Plus,
  Trash2,
  FileSignature,
  Move,
  RotateCcw,
  Lock
} from 'lucide-react';

export interface TechnicalExhibitTemplateModalProps {
  item: { id: string; code: string; name: string };
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

interface OrgNode {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  location: string;
  level: 1 | 2 | 3;
  parentId?: string;
  x: number;
  y: number;
}

export interface KeyPersonnelMatrixCol {
  id: string;
  position: string;
  name: string;
  address: string;
  dob: string;
  citizenship: string;
  civilStatus: string;
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
}

const defaultKeyPersonnelCols: KeyPersonnelMatrixCol[] = [
  {
    id: 'col-1',
    position: 'PROJECT MANAGER 1',
    name: 'Vin Ocampo',
    address: 'Pasay City',
    dob: '02/24/87',
    citizenship: 'Filipino',
    civilStatus: 'Single',
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
    prcLicenseNo: ''
  },
  {
    id: 'col-2',
    position: 'PROJECT MANAGER 2',
    name: 'Mark Arjay B. Villagarcia',
    address: 'Camarines Sur',
    dob: '12/14/2003',
    citizenship: 'Filipino',
    civilStatus: 'Single',
    education: {
      elementarySchool: 'SIPOCOT NORTH CENTRAL SCHOOL',
      elementaryYear: '',
      highSchool: 'SIPOCOT CAMARINES SUR',
      highSchoolYear: '2013',
      collegeSchool: 'BOLO NORTE HIGH SCHOOL',
      collegeYear: '2018',
      postGradSchool: '',
      postGradYear: '',
      seminars: ''
    },
    prcLicenseNo: 'NO PRC'
  },
  {
    id: 'col-3',
    position: 'Project Communication Engineer 1',
    name: 'Aldrin Godalle',
    address: 'Laguna',
    dob: '09-28-80',
    citizenship: 'Filipino',
    civilStatus: 'Single',
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
    id: 'col-4',
    position: 'Project Electrical Engineer 1',
    name: 'Aaron James Cortez',
    address: 'Laguna',
    dob: '09/26/1993',
    citizenship: 'Filipino',
    civilStatus: 'Single',
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
    id: 'col-5',
    position: 'Accredited DPWH Materials Engineer',
    name: '',
    address: '',
    dob: '',
    citizenship: '',
    civilStatus: '',
    education: { elementarySchool: '', elementaryYear: '', highSchool: '', highSchoolYear: '', collegeSchool: '', collegeYear: '', postGradSchool: '', postGradYear: '', seminars: '' },
    prcLicenseNo: '',
    isSpecialColumn: true,
    specialNote: 'No DPWH MATERIALS NEEDED on this PROJECT'
  },
  {
    id: 'col-6',
    position: 'NETWORK Engineer / ForeMan',
    name: 'Hal David Fortuna',
    address: 'Dasma, Cavite',
    dob: '08-28-74',
    citizenship: 'Filipino',
    civilStatus: 'Married',
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
    id: 'col-7',
    position: 'NETWORK Engineer / ForeMan',
    name: 'John Gerald Rivera',
    address: 'Dasma, Cavite',
    dob: '06-22-1986',
    citizenship: 'Filipino',
    civilStatus: 'Married',
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
    id: 'col-8',
    position: 'Qualified/Certified Safety and Health Personnel',
    name: '',
    address: '',
    dob: '',
    citizenship: '',
    civilStatus: '',
    education: { elementarySchool: '', elementaryYear: '', highSchool: '', highSchoolYear: '', collegeSchool: '', collegeYear: '', postGradSchool: '', postGradYear: '', seminars: '' },
    prcLicenseNo: '',
    isSpecialColumn: true,
    specialNote: '(COSH) CONSTRUCTION OCCUPATIONAL SAFETY and HEALTH'
  },
  {
    id: 'col-9',
    position: 'Other positions (as deemed necessary by the applicant-firm for this project)',
    name: '',
    address: '',
    dob: '',
    citizenship: '',
    civilStatus: '',
    education: { elementarySchool: '', elementaryYear: '', highSchool: '', highSchoolYear: '', collegeSchool: '', collegeYear: '', postGradSchool: '', postGradYear: '', seminars: '' },
    prcLicenseNo: '',
    isSpecialColumn: true,
    specialNote: 'NETWORK TECHNICIAN'
  }
];

export const TechnicalExhibitTemplateModal: React.FC<TechnicalExhibitTemplateModalProps> = ({
  item,
  tenant,
  activeProjectRefNo = 'PRJ-2026-901283',
  activeProjectTitle = 'Infrastructure & IT Systems Modernization Project',
  activeProcuringEntity = 'Department of Information & Communications Technology',
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Opportunity Finder State
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Common State
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo);
  const [projectTitle, setProjectTitle] = useState(activeProjectTitle);
  const [procuringEntity, setProcuringEntity] = useState(activeProcuringEntity);
  const [dateTimeSubmitted, setDateTimeSubmitted] = useState('March 19, 2026');
  const [companyName, setCompanyName] = useState(tenant?.companyName || 'Bidding Entity Corporate Name');
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || 'Metro Manila, Philippines');
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'Authorized Signatory Name');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'President / General Manager');
  const [signatoryTin, setSignatoryTin] = useState(tenant?.authorizedSignatory?.tin || '123-456-789-000');

  // Item (d) Special PCAB License / JVA State
  const [jvaPartnerCompany, setJvaPartnerCompany] = useState('Partner Infrastructure Corp.');
  const [pcabLicenseNo, setPcabLicenseNo] = useState(tenant?.pcabLicenseNo || 'PCAB-2026-9012');
  const [pcabCategory, setPcabCategory] = useState(tenant?.pcabCategory || 'AAAA (General Engineering)');

  // Item (e) Bid Security BSD State
  const [securityType, setSecurityType] = useState<'BSD' | 'SURETY_BOND' | 'MANAGERS_CHECK'>('BSD');
  const [securityAmount, setSecurityAmount] = useState('PHP 250,000.00 (2% of ABC)');
  const [validityDays, setValidityDays] = useState('120 Calendar Days');
  const [suretyCompany, setSuretyCompany] = useState('GSIS / Pioneer Insurance Corporation');

  // Item (f.a) Organizational Chart State with Free Drag Positioning
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([
    {
      id: '1',
      name: tenant?.authorizedSignatory?.name || 'Engr. Noel Azutea',
      position: 'Project Director / Chief Executive',
      email: 'noel.azutea@company.com',
      phone: '0917-123-4567',
      location: 'Metro Manila',
      level: 1,
      x: 390,
      y: 15
    },
    {
      id: '2',
      name: 'Engr. Juan Dela Cruz',
      position: 'Project Manager',
      email: 'juan.delacruz@company.com',
      phone: '0918-987-6543',
      location: 'PRC: 0091823',
      level: 2,
      parentId: '1',
      x: 30,
      y: 180
    },
    {
      id: '3',
      name: 'Engr. Maria Santos',
      position: 'Chief Technical Architect',
      email: 'maria.santos@company.com',
      phone: '0919-876-5432',
      location: 'PRC: 0102938',
      level: 2,
      parentId: '1',
      x: 390,
      y: 180
    },
    {
      id: '4',
      name: 'Engr. Roberto Tan',
      position: 'Quality & Safety Director',
      email: 'roberto.tan@company.com',
      phone: '0920-765-4321',
      location: 'PRC: 0083921',
      level: 2,
      parentId: '1',
      x: 750,
      y: 180
    },
    {
      id: '5',
      name: 'Engr. Carlos Reyes',
      position: 'Lead Site Engineer',
      email: 'carlos.reyes@company.com',
      phone: '0921-654-3210',
      location: 'PRC: 0071234',
      level: 3,
      parentId: '2',
      x: 30,
      y: 365
    },
    {
      id: '6',
      name: 'Engr. Liza Mendoza',
      position: 'Systems Engineer',
      email: 'liza.mendoza@company.com',
      phone: '0922-543-2109',
      location: 'PRC: 0062345',
      level: 3,
      parentId: '3',
      x: 390,
      y: 365
    },
    {
      id: '7',
      name: 'Engr. Pedro Santos',
      position: 'Safety Inspector',
      email: 'pedro.santos@company.com',
      phone: '0923-432-1098',
      location: 'PRC: 0053456',
      level: 3,
      parentId: '4',
      x: 750,
      y: 365
    }
  ]);

  // Item (f.b) Key Personnel Multi-Page Matrix State
  const [keyPersonnelPages, setKeyPersonnelPages] = useState<{ id: string; cols: KeyPersonnelMatrixCol[] }[]>([
    { id: 'page-1', cols: defaultKeyPersonnelCols }
  ]);

  // Item (f.c) Equipment State
  const [equipmentList, setEquipmentList] = useState<{ id: string; description: string; model: string; serialNo: string; status: string; proofRef: string }[]>([
    { id: '1', description: 'Enterprise Fiber Optic Fusion Splicer System', model: 'Fujikura 90S+', serialNo: 'SN-90S-2026-88', status: 'Owned', proofRef: 'Official Receipt #89012' },
    { id: '2', description: 'OTDR Network Testing & Certification Rig', model: 'EXFO FTB-1v2', serialNo: 'SN-EXFO-1029', status: 'Owned', proofRef: 'OR/CR #10293' }
  ]);

  // Item (g) Omnibus Sworn Statement Specific State
  const [affiantCivilStatus, setAffiantCivilStatus] = useState('Single');
  const [affiantNationality, setAffiantNationality] = useState('Filipino');
  const [govIdType, setGovIdType] = useState('PRC License ID');
  const [govIdNumber, setGovIdNumber] = useState('PRC-0091823');

  // Notary Public State
  const [notaryCity, setNotaryCity] = useState('');
  const [docNo, setDocNo] = useState('');
  const [pageNo, setPageNo] = useState('');
  const [bookNo, setBookNo] = useState('');
  const [seriesYear, setSeriesYear] = useState('2026');

  // Load real saved opportunity projects
  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);
    if (list.length > 0 && !selectedOppId) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectTitle(first.title);
      setProcuringEntity(first.procuringEntity);
    }
  }, [tenant?.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const cleanCode = item.code.replace(/[^a-zA-Z0-9]/g, '');
    const cleanName = item.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `${projectRefNo}_Item_${cleanCode}_${cleanName}_${todayStr}.pdf`;

    const templateElems = document.querySelectorAll('.single-page-paper');
    if (templateElems.length > 0) {
      const elemArray = Array.from(templateElems) as HTMLElement[];
      await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
    }
  };

  const handleSave = async () => {
    try {
      const templateElems = document.querySelectorAll('.single-page-paper');
      let dataUrl: string | undefined = undefined;
      if (templateElems.length > 0) {
        const elemArray = Array.from(templateElems) as HTMLElement[];
        const canvases = await Promise.all(
          elemArray.map(el => html2canvas(el, {
            scale: 2.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            ignoreElements: (element: Element) => {
              return (
                element.classList.contains('print:hidden') ||
                element.classList.contains('no-export') ||
                element.tagName === 'BUTTON' ||
                element.getAttribute('role') === 'button'
              );
            }
          }))
        );

        if (canvases.length === 1) {
          dataUrl = canvases[0].toDataURL('image/png');
        } else {
          const totalWidth = Math.max(...canvases.map(c => c.width));
          const totalHeight = canvases.reduce((sum, c) => sum + c.height + 20, 0);
          const combinedCanvas = document.createElement('canvas');
          combinedCanvas.width = totalWidth;
          combinedCanvas.height = totalHeight;
          const ctx = combinedCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, totalWidth, totalHeight);
            let currentY = 0;
            canvases.forEach(c => {
              ctx.drawImage(c, 0, currentY);
              currentY += c.height + 20;
            });
            dataUrl = combinedCanvas.toDataURL('image/png');
          } else {
            dataUrl = canvases[0].toDataURL('image/png');
          }
        }
      }
      onSaveAndComplete(dataUrl, item.name, projectRefNo, projectTitle);
    } catch {
      onSaveAndComplete(undefined, item.name, projectRefNo, projectTitle);
    }
  };

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    if (targetTag === 'input' || targetTag === 'button' || targetTag === 'svg' || targetTag === 'path') {
      return;
    }
    setActiveDragId(id);
    const node = orgNodes.find(n => n.id === id);
    if (node) {
      setDragStartOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragId) return;
    const newX = Math.max(0, Math.min(820, e.clientX - dragStartOffset.x));
    const newY = Math.max(0, Math.min(480, e.clientY - dragStartOffset.y));
    setOrgNodes(prev => prev.map(n => n.id === activeDragId ? { ...n, x: newX, y: newY } : n));
  };

  const handlePointerUp = () => {
    setActiveDragId(null);
  };

  const resetOrgChartLayout = () => {
    setOrgNodes([
      { id: '1', name: tenant?.authorizedSignatory?.name || 'Engr. Noel Azutea', position: 'Project Director / Chief Executive', email: 'noel.azutea@company.com', phone: '0917-123-4567', location: 'Metro Manila', level: 1, x: 390, y: 15 },
      { id: '2', name: 'Engr. Juan Dela Cruz', position: 'Project Manager', email: 'juan.delacruz@company.com', phone: '0918-987-6543', location: 'PRC: 0091823', level: 2, parentId: '1', x: 30, y: 180 },
      { id: '3', name: 'Engr. Maria Santos', position: 'Chief Technical Architect', email: 'maria.santos@company.com', phone: '0919-876-5432', location: 'PRC: 0102938', level: 2, parentId: '1', x: 390, y: 180 },
      { id: '4', name: 'Engr. Roberto Tan', position: 'Quality & Safety Director', email: 'roberto.tan@company.com', phone: '0920-765-4321', location: 'PRC: 0083921', level: 2, parentId: '1', x: 750, y: 180 },
      { id: '5', name: 'Engr. Carlos Reyes', position: 'Lead Site Engineer', email: 'carlos.reyes@company.com', phone: '0921-654-3210', location: 'PRC: 0071234', level: 3, parentId: '2', x: 30, y: 365 },
      { id: '6', name: 'Engr. Liza Mendoza', position: 'Systems Engineer', email: 'liza.mendoza@company.com', phone: '0922-543-2109', location: 'PRC: 0062345', level: 3, parentId: '3', x: 390, y: 365 },
      { id: '7', name: 'Engr. Pedro Santos', position: 'Safety Inspector', email: 'pedro.santos@company.com', phone: '0923-432-1098', location: 'PRC: 0053456', level: 3, parentId: '4', x: 750, y: 365 }
    ]);
  };

  const addOrgNode = (level: 1 | 2 | 3 = 3) => {
    const level2Nodes = orgNodes.filter(n => n.level === 2);
    const parentId = level === 3 && level2Nodes.length > 0 ? level2Nodes[0].id : '1';
    setOrgNodes(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: 'Engr. New Member',
        position: level === 2 ? 'Division Lead' : 'Field Engineer',
        email: 'member@company.com',
        phone: '0917-000-0000',
        location: 'PRC: 0000000',
        level: level,
        parentId: parentId,
        x: 200 + (prev.length * 25) % 450,
        y: 180 + (prev.length * 20) % 250
      }
    ]);
  };

  const updateOrgNode = (id: string, field: string, value: string) => {
    setOrgNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const removeOrgNode = (id: string) => {
    setOrgNodes(prev => prev.filter(n => n.id !== id));
  };

  const addKeyPersonnelPage = () => {
    if (keyPersonnelPages.length >= 50) {
      alert('Maximum 50 pages allowed.');
      return;
    }
    const newPageNum = keyPersonnelPages.length + 1;
    const newPageId = `page-${Date.now()}-${newPageNum}`;
    const newPageCols: KeyPersonnelMatrixCol[] = [
      {
        id: `col-${Date.now()}-1`,
        position: 'PROJECT ENGINEER / SPECIALIST',
        name: `Engr. Personnel ${newPageNum}`,
        address: 'Metro Manila',
        dob: '01/01/1990',
        citizenship: 'Filipino',
        civilStatus: 'Single',
        education: {
          elementarySchool: '',
          elementaryYear: '',
          highSchool: '',
          highSchoolYear: '',
          collegeSchool: 'University of the Philippines',
          collegeYear: '2012',
          postGradSchool: '',
          postGradYear: '',
          seminars: ''
        },
        prcLicenseNo: '00-00000'
      }
    ];
    setKeyPersonnelPages(prev => [...prev, { id: newPageId, cols: newPageCols }]);
  };

  const removeKeyPersonnelPage = (pageId: string) => {
    if (keyPersonnelPages.length <= 1) return;
    setKeyPersonnelPages(prev => prev.filter(p => p.id !== pageId));
  };

  const updateKeyPersonnelColInPage = (pageId: string, colId: string, field: string, value: string) => {
    setKeyPersonnelPages(prevPages => prevPages.map(page => {
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
    }));
  };

  const addKeyPersonnelColToPage = (pageId: string, isSpecial: boolean = false) => {
    const newId = `col-${Date.now()}`;
    const newCol: KeyPersonnelMatrixCol = isSpecial ? {
      id: newId,
      position: 'Special Certification Position',
      name: '',
      address: '',
      dob: '',
      citizenship: '',
      civilStatus: '',
      education: { elementarySchool: '', elementaryYear: '', highSchool: '', highSchoolYear: '', collegeSchool: '', collegeYear: '', postGradSchool: '', postGradYear: '', seminars: '' },
      prcLicenseNo: '',
      isSpecialColumn: true,
      specialNote: 'Custom Certification / Exemption Notice'
    } : {
      id: newId,
      position: 'Project Engineer',
      name: 'Engr. New Key Personnel',
      address: 'Metro Manila',
      dob: '01/01/1990',
      citizenship: 'Filipino',
      civilStatus: 'Single',
      education: { elementarySchool: '', elementaryYear: '', highSchool: '', highSchoolYear: '', collegeSchool: 'University of the Philippines', collegeYear: '2012', postGradSchool: '', postGradYear: '', seminars: '' },
      prcLicenseNo: '00-00000'
    };

    setKeyPersonnelPages(prevPages => prevPages.map(page => {
      if (page.id !== pageId) return page;
      return { ...page, cols: [...page.cols, newCol] };
    }));
  };

  const removeKeyPersonnelColFromPage = (pageId: string, colId: string) => {
    setKeyPersonnelPages(prevPages => prevPages.map(page => {
      if (page.id !== pageId) return page;
      return { ...page, cols: page.cols.filter(c => c.id !== colId) };
    }));
  };

  const resetKeyPersonnelPages = () => {
    setKeyPersonnelPages([{ id: 'page-1', cols: defaultKeyPersonnelCols }]);
  };

  const addEquipment = () => {
    setEquipmentList(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        description: 'New Heavy Equipment Unit',
        model: 'Standard Model',
        serialNo: 'SN-2026-001',
        status: 'Owned',
        proofRef: 'OR/CR #00000'
      }
    ]);
  };

  // Standalone dedicated modals for Organizational Chart (f.a), Key Personnel (f.b) & Equipment List (f.c)
  if (item.code === '(f.a)') {
    return (
      <OrganizationalChartModal
        item={item}
        tenant={tenant}
        activeProjectRefNo={activeProjectRefNo}
        activeProjectTitle={activeProjectTitle}
        activeProcuringEntity={activeProcuringEntity}
        onSaveAndComplete={onSaveAndComplete}
        onClose={onClose}
      />
    );
  }

  if (item.code === '(f.b)' || item.code === '(f)' || item.code === '(b)') {
    return (
      <KeyPersonnelModal
        item={item}
        tenant={tenant}
        activeProjectRefNo={activeProjectRefNo}
        activeProjectTitle={activeProjectTitle}
        activeProcuringEntity={activeProcuringEntity}
        onSaveAndComplete={onSaveAndComplete}
        onClose={onClose}
      />
    );
  }

  if (item.code === '(f.c)') {
    return (
      <EquipmentListModal
        item={item}
        tenant={tenant}
        activeProjectRefNo={activeProjectRefNo}
        activeProjectTitle={activeProjectTitle}
        activeProcuringEntity={activeProcuringEntity}
        onSaveAndComplete={onSaveAndComplete}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">

      {/* PRINT STYLESHEET OVERRIDE */}
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in landscape;
            margin: 0.2in;
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
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }
          .single-page-paper {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0.18in !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .export-text {
            display: block !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[96vw] overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:bg-white">

        {/* Top Controls Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 print:hidden no-export">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Class A Statutory Technical Exhibit — Item {item.code}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                  {item.code === '(f.a)' || item.code === '(f.b)' || item.code === '(f.c)' || item.code === '(f)' ? 'Legal 13" × 8.5" Landscape Standard' : item.code === '(g)' ? '2-Page Official GPPB Layout' : 'Legal Paper Standard'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xl">
                {item.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Item (f.a) External Toolbar Controls (Outside the Printable Page) */}
        {item.code === '(f.a)' && (
          <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between print:hidden no-export shrink-0">
            <span className="text-xs text-blue-300 font-mono flex items-center gap-1.5">
              🖐️ <strong>Drag & Place Enabled:</strong> Click and drag any card header to position it anywhere on the page
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={resetOrgChartLayout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Auto-Align
              </button>
              <button
                onClick={() => addOrgNode(2)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Level 2 Lead
              </button>
              <button
                onClick={() => addOrgNode(3)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Field Specialist
              </button>
            </div>
          </div>
        )}

        {/* Item (f.b) External Toolbar Controls (Outside the Printable Page) */}
        {(item.code === '(f.b)' || item.code === '(f)') && (
          <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between print:hidden no-export shrink-0">
            <span className="text-xs text-blue-300 font-mono flex items-center gap-1.5 font-bold">
              📄 Key Personnel Pages ({keyPersonnelPages.length}):
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={addKeyPersonnelPage}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Page</span>
              </button>
              <button
                onClick={() => addKeyPersonnelColToPage(keyPersonnelPages[0].id, false)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Personnel Col</span>
              </button>
              <button
                onClick={() => addKeyPersonnelColToPage(keyPersonnelPages[0].id, true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Special Col</span>
              </button>
              <button
                onClick={resetKeyPersonnelPages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition shadow cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Sample Matrix</span>
              </button>
            </div>
          </div>
        )}

        {/* Item (f.c) External Toolbar Controls (Outside the Printable Page) */}
        {item.code === '(f.c)' && (
          <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between print:hidden no-export shrink-0">
            <span className="text-xs text-blue-300 font-mono flex items-center gap-1.5 font-bold">
              🚜 Equipment List ({equipmentList.length} Units):
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={addEquipment}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Equipment</span>
              </button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 space-y-4 print:p-0 print:bg-white">

          {/* Editor Form Inputs (Screen Only) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:hidden no-export">

            {/* Target Project Dropdown Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 text-blue-300">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Target Bidding Project:</span>
                </label>
                {(activeProjectRefNo || (selectedOppId && selectedOppId !== '')) && (
                  <span className="text-[10px] text-amber-400 font-bold font-mono flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Project Locked (Strict Isolation Active)</span>
                  </span>
                )}
              </div>
              <select
                value={selectedOppId}
                disabled={Boolean(activeProjectRefNo || (selectedOppId && selectedOppId !== ''))}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedOppId(val);
                  const found = oppProjects.find((p) => p.id === val || p.refNo === val);
                  if (found) {
                    setProjectRefNo(found.refNo);
                    setProjectTitle(found.title);
                    setProcuringEntity(found.procuringEntity);
                  }
                }}
                className="w-full bg-slate-950 border border-blue-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400 shadow-inner disabled:opacity-85 disabled:cursor-not-allowed disabled:bg-slate-900/90"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Project Ref. No.</label>
                <input
                  type="text"
                  value={projectRefNo}
                  disabled={Boolean(activeProjectRefNo || (selectedOppId && selectedOppId !== ''))}
                  onChange={(e) => setProjectRefNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Project Title</label>
                <input
                  type="text"
                  value={projectTitle}
                  disabled={Boolean(activeProjectRefNo || (selectedOppId && selectedOppId !== ''))}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Procuring Entity</label>
                <input
                  type="text"
                  value={procuringEntity}
                  onChange={(e) => setProcuringEntity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Authorized Signatory / Affiant Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Designation / Position</label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Signatory TIN</label>
                <input
                  type="text"
                  value={signatoryTin}
                  onChange={(e) => setSignatoryTin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Custom Inputs per Item */}
            {item.code === '(d)' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">JV Partner Company</label>
                  <input type="text" value={jvaPartnerCompany} onChange={(e) => setJvaPartnerCompany(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Special PCAB License No.</label>
                  <input type="text" value={pcabLicenseNo} onChange={(e) => setPcabLicenseNo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">PCAB Category & Classification</label>
                  <input type="text" value={pcabCategory} onChange={(e) => setPcabCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
            )}

            {item.code === '(e)' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-200 font-bold mb-1">Form of Security Option:</label>
                  <select value={securityType} onChange={(e) => setSecurityType(e.target.value as any)} className="w-full bg-slate-950 border border-blue-500/80 rounded-lg px-3 py-2 text-white font-bold cursor-pointer">
                    <option value="BSD">Bid Securing Declaration (BSD Form)</option>
                    <option value="SURETY_BOND">Surety Bond / Security Bond</option>
                    <option value="MANAGERS_CHECK">Manager's / Cashier's Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Security Amount</label>
                  <input type="text" value={securityAmount} onChange={(e) => setSecurityAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Validity Period</label>
                  <input type="text" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Issuer / Bank / Insurance Co.</label>
                  <input type="text" value={suretyCompany} onChange={(e) => setSuretyCompany(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
            )}

            {item.code === '(g)' && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Affiant Civil Status</label>
                  <input type="text" value={affiantCivilStatus} onChange={(e) => setAffiantCivilStatus(e.target.value)} placeholder="Single / Married / Legal Age" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Affiant Nationality</label>
                  <input type="text" value={affiantNationality} onChange={(e) => setAffiantNationality(e.target.value)} placeholder="Filipino" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Government ID Type</label>
                  <input type="text" value={govIdType} onChange={(e) => setGovIdType(e.target.value)} placeholder="PRC License / Driver's License / Passport" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Government ID Number</label>
                  <input type="text" value={govIdNumber} onChange={(e) => setGovIdNumber(e.target.value)} placeholder="PRC-0091823" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Notary Jurat Location</label>
                  <input type="text" value={notaryCity} onChange={(e) => setNotaryCity(e.target.value)} placeholder="Leave blank or enter city" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
            )}

          </div>

          {/* NON-ITEM (g), NON-ITEM (f.b) AND NON-ITEM (f.c) STANDARD SINGLE PAGE LEGAL PAPER CONTAINER */}
          {item.code !== '(g)' && item.code !== '(f.b)' && item.code !== '(f)' && item.code !== '(f.c)' && (
            <div className={`single-page-paper bg-white text-slate-900 font-legal p-6 sm:p-7 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-3 max-w-[1280px] min-h-[740px] aspect-[13/8.5] h-auto mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none`}>

              {/* Outer Legal Frame */}
              <div className="absolute inset-4 border-2 border-slate-900 pointer-events-none rounded-xl" />

              <div className="space-y-6">

                {/* Document Header */}
                {!(item.code === '(e)' && securityType === 'BSD') && (
                  <div className="border-b-2 border-slate-900 pb-3 font-mono text-[11px] text-slate-950 font-bold mb-4 relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 z-10">
                        <div>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></div>
                        <div>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></div>
                        <div>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></div>
                      </div>

                      {item.code === '(f.a)' && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-max max-w-[65%] z-0">
                          <h4 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-widest text-slate-950 font-mono">
                            ORGANIZATIONAL CHART
                          </h4>
                        </div>
                      )}

                      {item.code === '(f.c)' && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-max max-w-[65%] z-0">
                          <h3 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-slate-950 font-serif border-b-2 border-slate-950 pb-0.5 leading-tight">
                            LIST OF CONTRACTOR'S MAJOR EQUIPMENT UNITS
                          </h3>
                        </div>
                      )}

                      <div className="text-right z-10">
                        <span>DATE: <strong>{todayStr}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ITEM (d) SPECIAL PCAB LICENSE */}
                {item.code === '(d)' && (
                  <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed">
                    <p>
                      <strong>REPUBLIC OF THE PHILIPPINES</strong>)<br />
                      CITY OF ____________________ ) S.S.
                    </p>
                    <h4 className="font-bold text-center uppercase border-b pb-1">JOINT VENTURE AGREEMENT & SPECIAL PCAB LICENSE CERTIFICATION</h4>
                    <p>
                      KNOW ALL MEN BY THESE PRESENTS: That <strong>{companyName}</strong>, represented herein by <strong>{signatoryName}</strong>, and <strong>{jvaPartnerCompany}</strong>, have entered into a Joint Venture Agreement for the purpose of jointly participating in the procurement of <strong>{projectTitle}</strong> under Ref. No. <strong>{projectRefNo}</strong>.
                    </p>
                    <div className="p-3 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] space-y-1">
                      <p><strong>SPECIAL PCAB LICENSE NO:</strong> {pcabLicenseNo}</p>
                      <p><strong>LICENSE CATEGORY:</strong> {pcabCategory}</p>
                      <p><strong>JOINT VENTURE REGISTRATION STATUS:</strong> FULLY COMPLIANT / REGISTERED</p>
                    </div>
                    <p>
                      IN WITNESS WHEREOF, we have hereunto set our hands this {new Date().getDate()}th day of {new Date().toLocaleString('default', { month: 'long' })}, {seriesYear}.
                    </p>
                  </div>
                )}

                {/* ITEM (e) OPTION 1: OFFICIAL GPPB BID SECURING DECLARATION FORM */}
                {item.code === '(e)' && securityType === 'BSD' && (
                  <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed font-normal pt-2">
                    <div className="border-b-2 border-slate-900 pb-3 space-y-1 font-mono text-[11px] text-slate-950 font-bold mb-4">
                      <div className="flex items-center justify-between">
                        <span>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></span>
                        <span>DATE: <strong>{todayStr}</strong></span>
                      </div>
                      <div>
                        <span>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></span>
                      </div>
                      <div>
                        <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></span>
                      </div>
                    </div>

                    <div className="text-center font-serif space-y-1 mb-4">
                      <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide border-b border-black pb-1">
                        Bid Securing Declaration Form
                      </h3>
                      <p className="text-[11px] italic text-slate-700">
                        [shall be submitted with the Bid if bidder opts to provide this form of bid security]
                      </p>
                    </div>

                    <p className="font-serif">
                      REPUBLIC OF THE PHILIPPINES)<br />
                      CITY OF ____________________ ) S.S.
                    </p>

                    <div className="text-center my-4 font-serif space-y-1">
                      <h4 className="text-sm sm:text-base font-bold uppercase tracking-wide">BID SECURING DECLARATION</h4>
                      <p className="text-xs font-bold font-mono">
                        Project Identification No.: <u className="font-bold text-blue-950">{projectRefNo || '[Insert number]'}</u>
                      </p>
                    </div>

                    <p className="font-serif">
                      To: <strong><u>{procuringEntity || '[Insert name and address of the Procuring Entity]'}</u></strong><br />
                      <span className="text-[11px] text-slate-700 italic">Name of Project: {projectTitle}</span>
                    </p>

                    <p className="font-serif pt-1">
                      I, the undersigned, declare that:
                    </p>

                    <ol className="list-decimal pl-6 space-y-6 font-serif leading-relaxed text-justify">
                      <li>
                        I understand that, according to your conditions, bids must be supported by a Bid Security, which may be in the form of a Bid Securing Declaration.
                      </li>
                      <li>
                        I accept that:
                        (a) I will be automatically disqualified from bidding for any procurement contract with any procuring entity for a period of two (2) years upon receipt of your Blacklisting Order; and,
                        (b) I will pay the applicable fine provided under Section 6 of the Guidelines on the Use of Bid Securing Declaration, within fifteen (15) days from receipt of the written demand by the procuring entity for the commission of acts resulting to the enforcement of the bid securing declaration under Sections 23.1(b), 34.2, 40.1 and 69.1, except 69.1(f), of the IRR of RA No. 9184; without prejudice to other legal action the government may undertake.
                      </li>
                      <li>
                        I understand that this Bid Securing Declaration shall cease to be valid on the following circumstances:
                        <ol className="list-[lower-alpha] pl-6 space-y-1.5 mt-1.5">
                          <li>Upon expiration of the bid validity period, or any extension thereof pursuant to your request;</li>
                          <li>I am are declared ineligible or post-disqualified upon receipt of your notice to such effect, and (i) I failed to timely file a request for reconsideration or (ii) I filed a waiver to avail of said right; and</li>
                          <li>I am are declared the bidder with the Lowest Calculated Responsive Bid, and I have furnished the performance security and signed the Contract.</li>
                        </ol>
                      </li>
                    </ol>

                    <p className="font-serif pt-4 leading-relaxed">
                      IN WITNESS WHEREOF, I have hereunto set my/our hand/s this _____ day of __________________ at ____________________.
                    </p>

                    <div className="pt-6 flex flex-col items-end text-right font-serif space-y-1">
                      <div className="border-b border-black w-72 text-center pb-1">
                        <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                        <p className="font-bold text-slate-950 uppercase mt-0.5">{signatoryName}</p>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-800 text-center w-72">{signatoryTitle}</p>
                      <p className="text-[11px] text-slate-600 font-bold text-center w-72">Affiant</p>
                    </div>

                    <div className="pt-6 font-serif space-y-2">
                      <p className="text-[10px] italic text-slate-600">
                      </p>
                      <div className="text-[11px] font-mono text-slate-700 space-y-1 pt-1">
                        <p>Doc. No. _________;</p>
                        <p>Page No. _________;</p>
                        <p>Book No. _________;</p>
                        <p>Series of _________.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ITEM (e) OPTION 2: SURETY BOND / MANAGER'S CHECK */}
                {item.code === '(e)' && securityType !== 'BSD' && (
                  <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed">
                    <p>
                      <strong>REPUBLIC OF THE PHILIPPINES</strong>)<br />
                      CITY OF ____________________ ) S.S.
                    </p>
                    <h4 className="font-bold text-center uppercase border-b pb-1">ORIGINAL BID SECURITY CERTIFICATION ({securityType.replace('_', ' ')})</h4>
                    <p>
                      To: <strong>{procuringEntity}</strong><br />
                      Address: Metro Manila, Philippines
                    </p>
                    <p>
                      This is to certify that <strong>{companyName}</strong> has posted an original Bid Security for the project <strong>{projectTitle}</strong> under Ref. No. <strong>{projectRefNo}</strong>.
                    </p>
                    <div className="p-3 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] space-y-1">
                      <p><strong>FORM OF SECURITY:</strong> {securityType.replace('_', ' ')}</p>
                      <p><strong>SECURITY GUARANTEE AMOUNT:</strong> {securityAmount}</p>
                      <p><strong>VALIDITY PERIOD:</strong> {validityDays}</p>
                      <p><strong>ISSUING ENTITY:</strong> {suretyCompany}</p>
                    </div>
                  </div>
                )}

                {/* ITEM (f.a): OFFICIAL FREE DRAG-AND-PLACE ORGANIZATIONAL CHART WITH DYNAMIC SVG CONNECTING LINES */}
                {item.code === '(f.a)' && (
                  <div className="space-y-2 text-xs font-sans flex-1 flex flex-col justify-between">
                    {/* CANVAS TOOLBAR */}
                    <div className="flex flex-wrap items-center justify-between bg-slate-100 p-2 rounded-xl border border-slate-300 print:hidden no-export gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addOrgNode(2)}
                          className="px-3 py-1.5 bg-blue-900 text-white rounded-lg font-bold text-[11px] hover:bg-blue-800 flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Manager Box (Level 2)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addOrgNode(3)}
                          className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-bold text-[11px] hover:bg-slate-700 flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Engineer Box (Level 3)</span>
                        </button>
                        <button
                          type="button"
                          onClick={resetOrgChartLayout}
                          className="px-3 py-1.5 bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] hover:bg-slate-300 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Layout</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-700 font-mono font-semibold">
                        💡 Drag boxes & select <strong className="text-blue-950">"Connects To"</strong> to auto-render vector lines
                      </div>
                    </div>

                    {/* DRAGGABLE FREE-FORM CANVAS WITH REAL-TIME SVG CONNECTOR OVERLAY */}
                    <div
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="relative w-full flex-1 min-h-[500px] h-[530px] sm:h-[550px] bg-slate-50/50 border border-dashed border-slate-300 rounded-xl overflow-hidden select-none print:h-[580px] print:border-none print:bg-transparent"
                    >
                      {/* DYNAMIC SVG CONNECTING LINES OVERLAY */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        {orgNodes.map((child) => {
                          if (!child.parentId) return null;
                          const parent = orgNodes.find(n => n.id === child.parentId);
                          if (!parent) return null;

                          const cardWidth = 288; // w-72 = 288px
                          const cardHeight = child.level > 1 ? 130 : 110;

                          const px = parent.x + cardWidth / 2;
                          const py = parent.y + (parent.level > 1 ? 130 : 110);
                          const cx = child.x + cardWidth / 2;
                          const cy = child.y;

                          if (cy > py) {
                            const midY = py + (cy - py) / 2;
                            return (
                              <g key={`connector-${parent.id}-${child.id}`}>
                                <path
                                  d={`M ${px} ${py} V ${midY} H ${cx} V ${cy}`}
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <polygon
                                  points={`${cx - 5},${cy - 6} ${cx + 5},${cy - 6} ${cx},${cy}`}
                                  fill="#0f172a"
                                />
                              </g>
                            );
                          } else {
                            return (
                              <g key={`connector-${parent.id}-${child.id}`}>
                                <line
                                  x1={px}
                                  y1={parent.y + 55}
                                  x2={cx}
                                  y2={cy + 55}
                                  stroke="#0f172a"
                                  strokeWidth="2.5"
                                  strokeDasharray="4 4"
                                />
                              </g>
                            );
                          }
                        })}
                      </svg>

                      {orgNodes.map((node) => (
                        <div
                          key={node.id}
                          onPointerDown={(e) => handlePointerDown(node.id, e)}
                          style={{
                            position: 'absolute',
                            left: `${node.x}px`,
                            top: `${node.y}px`,
                            touchAction: 'none'
                          }}
                          className={`w-72 border-2 ${node.level === 1 ? 'border-slate-900 shadow-xl z-20' : 'border-slate-700 shadow-md z-10'
                            } rounded-xl overflow-hidden bg-white cursor-grab active:cursor-grabbing transition-shadow ${activeDragId === node.id ? 'ring-4 ring-blue-500/50 z-30 shadow-2xl' : ''
                            }`}
                        >
                          {/* Header Bar */}
                          <div className={`${node.level === 1 ? 'bg-slate-900' : 'bg-slate-700'} text-white px-2 py-1.5 flex items-center justify-between`}>
                            <div className="flex items-center gap-1 shrink-0 print:hidden no-export">
                              <Move className="w-3 h-3 text-slate-300" />
                            </div>
                            <div className="w-full text-center">
                              <input
                                type="text"
                                value={node.name}
                                onChange={(e) => updateOrgNode(node.id, 'name', e.target.value)}
                                className="font-bold text-[11px] text-center w-full bg-transparent border-none text-white focus:outline-none uppercase cursor-text"
                              />
                              <input
                                type="text"
                                value={node.position}
                                onChange={(e) => updateOrgNode(node.id, 'position', e.target.value)}
                                className="text-[9.5px] text-slate-300 text-center w-full bg-transparent border-none focus:outline-none cursor-text"
                              />
                            </div>
                            {orgNodes.length > 1 && (
                              <button
                                onClick={() => removeOrgNode(node.id)}
                                className="p-0.5 text-red-300 hover:text-white print:hidden no-export shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Body Info */}
                          <div className="p-2 bg-slate-50 flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full ${node.level === 1 ? 'bg-slate-900' : 'bg-blue-900'} text-white flex items-center justify-center shrink-0 font-bold text-[10px]`}>
                              {node.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div className="space-y-0.5 text-[9px] font-mono text-slate-700 w-full">
                              <input
                                type="text"
                                value={node.email}
                                onChange={(e) => updateOrgNode(node.id, 'email', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none truncate text-blue-900 cursor-text"
                              />
                              <input
                                type="text"
                                value={node.phone}
                                onChange={(e) => updateOrgNode(node.id, 'phone', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none cursor-text"
                              />
                              <input
                                type="text"
                                value={node.location}
                                onChange={(e) => updateOrgNode(node.id, 'location', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none font-bold text-slate-900 cursor-text"
                              />
                            </div>
                          </div>

                          {/* Reports To / Connect Line Selector */}
                          {node.level > 1 && (
                            <div className="px-2 py-1 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[8.5px] font-mono print:hidden no-export">
                              <span className="text-slate-600 font-bold">Connects To:</span>
                              <select
                                value={node.parentId || ''}
                                onChange={(e) => updateOrgNode(node.id, 'parentId', e.target.value)}
                                className="bg-white border border-slate-300 rounded px-1 py-0.5 text-[8.5px] font-bold text-blue-950 focus:outline-none cursor-pointer max-w-[170px] truncate"
                              >
                                <option value="">(No Line / Root)</option>
                                {orgNodes.filter(n => n.id !== node.id).map(n => (
                                  <option key={n.id} value={n.id}>
                                    {n.name.substring(0, 16)} ({n.position.substring(0, 16)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}





              </div>

              {/* Verification Footer Seal with Smartphone Scannable QR Code */}
              <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] font-mono text-slate-700 relative z-10 px-2 pb-1">
                <div className="flex items-center gap-2.5">
                  <DocumentQrCode
                    details={{
                      companyName: companyName,
                      documentName: `Item ${item.code} — ${item.name}`,
                      documentNumber: `EXHIBIT-${item.code.replace(/[^a-zA-Z0-9]/g, '')}-${projectRefNo || '2026-901283'}`,
                      projectTitle: projectTitle,
                      projectRefNo: projectRefNo,
                      procuringEntity: procuringEntity,
                      dateTimeSubmitted: dateTimeSubmitted || 'March 19, 2026',
                      documentCategory: 'Technical Eligibility',
                      generatedBy: companyName
                    }}
                    size={48}
                    showCaption={false}
                  />
                  <div className="space-y-0.5 font-mono text-[8.5px] text-slate-800">
                    <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                    <p>PROJECT: <strong>{projectTitle}</strong></p>
                    <p>REF NO: <strong>{projectRefNo}</strong> • PROCURING ENTITY: <strong>{procuringEntity}</strong></p>
                  </div>
                </div>
              </div>

            </div>
          )}



          {/* ITEM (g): OFFICIAL 2-PAGE RA 12009 / GPPB OMNIBUS SWORN STATEMENT FORM */}
          {item.code === '(g)' && (
            <div className="space-y-8">

              {/* PAGE 1 OF 2 */}
              <div className="single-page-paper bg-white text-slate-900 font-legal p-3 sm:p-5 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-4 max-w-[1280px] min-h-[740px] aspect-[13/8.5] mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none">
                <div className="absolute inset-4 border-2 border-slate-900 pointer-events-none rounded-xl" />

                <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed font-normal pt-2">
                  <div className="border-b-2 border-slate-900 pb-3 space-y-1 font-mono text-[11px] text-slate-950 font-bold mb-4">
                    <div className="flex items-center justify-between">
                      <span>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></span>
                      <span>DATE: <strong>{todayStr}</strong></span>
                    </div>
                    <div>
                      <span>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></span>
                    </div>
                    <div>
                      <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></span>
                    </div>
                  </div>

                  <div className="text-center font-serif space-y-1 mb-4">
                    <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide border-b border-black pb-1">
                      Omnibus Sworn Statement Form
                    </h3>
                    <p className="text-[11px] italic text-slate-700">
                      [Note: The duly accomplished form shall be submitted with the Bid]
                    </p>
                  </div>

                  <p className="font-serif">
                    REPUBLIC OF THE PHILIPPINES)<br />
                    CITY/MUNICIPALITY OF ____________________ ) S.S.
                  </p>

                  <div className="text-center my-3 font-serif">
                    <h4 className="text-sm sm:text-base font-bold uppercase tracking-wide">OMNIBUS SWORN STATEMENT</h4>
                  </div>

                  <p className="font-serif leading-relaxed text-justify">
                    I, <strong><u>{signatoryName || '[Name of Affiant]'}</u></strong>, of legal age, <u>{affiantCivilStatus || 'Legal Age'}</u>, <u>{affiantNationality || 'Filipino'}</u>, and with residence at <strong><u>{companyAddress || '[Address of Affiant]'}</u></strong>, after having been duly sworn in accordance with law, do hereby depose and state that:
                  </p>

                  <ol className="list-decimal pl-6 space-y-6 font-serif leading-relaxed text-justify">
                    <li>
                      <span className="italic text-slate-700"></span>
                      <p className="mt-0.5">
                        • <em>Corporation,</em> I am the duly authorized and designated representative of <strong><u>{companyName}</u></strong> with office address at <strong><u>{companyAddress}</u></strong>;
                      </p>
                    </li>

                    <li>
                      <span className="italic text-slate-700"></span>
                      <p className="mt-0.5">
                        • <em>Corporation, </em> I am granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for <strong><u>{projectTitle}</u></strong> of the <strong><u>{procuringEntity}</u></strong>, as supported by the attached duly notarized Special Power of Attorney, Board/Partnership Resolution, or Secretary's Certificate, whichever is applicable;
                      </p>
                    </li>

                    <li>
                      <strong><u>{companyName}</u></strong> is not "blacklisted" or barred from bidding by the Government of the Philippines or any of its agencies, offices, corporations, or Local Government Units, foreign government/foreign or international financing institution whose blacklisting rules have been recognized by the Government Procurement Policy Board; by itself or by relation, membership, association, affiliation, or controlling interest with another blacklisted person or entity;
                    </li>

                    <li>
                      Each of the documents submitted in satisfaction of the bidding requirements is an authentic copy of the original, complete, and all statements and information provided therein are true and correct;
                    </li>

                    <li>
                      <strong><u>{companyName}</u></strong> is authorizing the Head of the Procuring Entity or its duly authorized representative(s) to verify all the documents submitted;
                    </li>

                    <li>
                      <span className="italic text-slate-700"></span>
                      <p className="mt-0.5">
                        • <em>Corporation,</em> The corporation  itself, and officers, directors, controlling stockholders and beneficial owners of <strong><u>{companyName}</u></strong> are not related by consanguinity or affinity up to the third civil degree to the Head of the Procuring Entity, Procurement Agent (if engaged), End-User or Implementing Unit, project consultants, head of the Project Management Office, or the members of the Bids and Awards Committee (BAC), the Technical Working Group, and the BAC Secretariat;
                      </p>
                    </li>

                    <li>
                      It is understood that failure to faithfully disclose its relationship with the Head of the Procuring Entity, members of the BAC, TWG, and Secretariat, or the project consultants of the Procuring Entity by consanguinity or affinity up to the third civil degree, as well as submission of beneficial ownership information containing false entries shall be subject to blacklisting under Section 100 of the IRR of RA No. 12009.
                      <p className="mt-0.5 font-semibold">
                        • <em>In case of corporations:</em> <strong><u>{companyName}</u></strong> declares its beneficial ownership information consistent with its updated General Information Sheet (GIS) or Beneficial Ownership Declaration Form duly submitted to the SEC in compliance with Sections 20.2.9.1, 81, and 82 of the IRR of RA No. 12009.
                      </p>
                    </li>

                    <li>
                      <strong><u>{companyName}</u></strong> complies with existing labor laws and standards; and
                    </li>

                    <li>
                      <strong><u>{companyName}</u></strong> is aware of and has undertaken the following responsibilities as a Bidder:
                      <ol className="list-[lower-alpha] pl-6 space-y-1 mt-1">
                        <li>Carefully examine all of the Bidding Documents;</li>
                        <li>Acknowledge all conditions, local or otherwise, affecting the implementation of the Contract;</li>
                        <li>Made an estimate of the facilities available and needed for the contract to be bid, if any; and</li>
                        <li>Inquire or secure Supplemental/Bid Bulletin(s) issued for the <strong><u>{projectTitle}</u></strong>.</li>
                      </ol>
                    </li>
                  </ol>
                </div>

                <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9px] font-mono text-slate-700">
                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: `Item (g) Omnibus Sworn Statement (Page 1 of 2)`,
                        documentNumber: `EXHIBIT-G-${projectRefNo || '2026-901283'}-P1`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: dateTimeSubmitted || 'March 19, 2026',
                        documentCategory: 'Technical Eligibility',
                        generatedBy: companyName
                      }}
                      size={55}
                      showCaption={false}
                    />
                    <div className="space-y-0.5 font-mono text-[9px] text-slate-800">
                      <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                      <p>PROJECT: <strong>{projectTitle}</strong></p>
                      <p>REF NO: <strong>{projectRefNo}</strong> • PROCURING ENTITY: <strong>{procuringEntity}</strong></p>
                    </div>
                  </div>
                  <span className="font-bold font-mono">Page 1 of 2</span>
                </div>
              </div>

              {/* PAGE 2 OF 2 */}
              <div className="single-page-paper bg-white text-slate-900 font-legal p-3 sm:p-5 border-2 border-slate-900 rounded-2xl shadow-2xl space-y-4 max-w-[1280px] min-h-[740px] aspect-[13/8.5] mx-auto text-left relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none">
                <div className="absolute inset-4 border-2 border-slate-900 pointer-events-none rounded-xl" />

                <div className="space-y-4 text-xs font-serif text-slate-900 leading-relaxed font-normal pt-2">
                  <div className="border-b-2 border-slate-900 pb-3 space-y-1 font-mono text-[11px] text-slate-950 font-bold mb-4">
                    <div className="flex items-center justify-between">
                      <span>PROJECT REF. NO: <strong className="text-blue-950">{projectRefNo}</strong></span>
                      <span>PAGE 2 OF 2 • DATE: <strong>{todayStr}</strong></span>
                    </div>
                    <div>
                      <span>NAME OF PROJECT: <strong className="text-slate-950">{projectTitle}</strong></span>
                    </div>
                    <div>
                      <span>PROCURING ENTITY: <strong className="text-slate-950">{procuringEntity}</strong></span>
                    </div>
                  </div>

                  <ol className="list-decimal pl-6 space-y-6 font-serif leading-relaxed text-justify" start={10}>
                    <li>
                      <strong><u>{companyName}</u></strong> did not give or pay directly or indirectly, any commission, amount, fee, or any form of consideration, pecuniary or otherwise, to any person or official, personnel or representative of the government in relation to any procurement project or activity.
                    </li>

                    <li>
                      In case advance payment was made or given to <strong><u>{companyName}</u></strong>, failure to perform or deliver any of the obligations and undertakings in the contract shall be sufficient grounds to constitute criminal liability under existing laws.
                    </li>
                  </ol>

                  <p className="font-serif pt-4 leading-relaxed">
                    IN WITNESS WHEREOF, I have hereunto set my hand this _____ day of __________, 20___ at <u>{notaryCity || '____________________'}</u>, Philippines.
                  </p>

                  <div className="pt-6 flex flex-col items-end text-right font-serif space-y-1">

                    <p className="text-xs font-bold text-slate-900 w-80 text-center">Duly authorized to sign the Bid for and behalf of:</p>

                    <p className="font-bold text-slate-950 uppercase w-80 text-center pt-1 border-b border-black">{companyName}</p>
                    <div className="pt-4 text-center w-80">

                      <p className="font-bold text-slate-950 uppercase">{signatoryName}</p>

                      <p className="text-[11px] font-semibold text-slate-800">{signatoryTitle}</p>
                    </div>
                  </div>

                  <div className="pt-6 font-serif space-y-2 border-t border-slate-300">
                    <p className="font-bold text-center uppercase text-xs tracking-wider"></p>
                    <p className="text-[11px] font-serif leading-relaxed text-justify">
                      SUBSCRIBED AND SWORN to before me this _____ day of __________________ 20___ at <u>{notaryCity || '____________________'}</u>, Philippines. Affiant/s is/are personally known to me and was/were identified by me through competent evidence of identity as defined in the 2004 Rules on Notarial Practice (A.M. No. 02-8-13-SC). Affiant/s exhibited to me his/her {govIdType || 'Government Issued ID'} with no. {govIdNumber || '___________'}, with his/her photograph and signature appearing thereon.
                    </p>

                    <p className="text-[11px] font-serif pt-1">
                      WITNESS MY HAND AND SEAL this _____ day of ________  ________.
                    </p>

                    <div className="pt-4 flex items-start justify-between text-[10px] font-mono text-slate-700">
                      <div className="space-y-0.5">
                        <p>Doc. No. _________;</p>
                        <p>Page No. _________;</p>
                        <p>Book No. _________;</p>
                        <p>Series of _________.</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="font-bold text-slate-950 uppercase">NAME OF NOTARY PUBLIC</p>

                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[9px] font-mono text-slate-700">
                  <div className="flex items-center gap-3">
                    <DocumentQrCode
                      details={{
                        companyName: companyName,
                        documentName: `Item (g) Omnibus Sworn Statement (Page 2 of 2)`,
                        documentNumber: `EXHIBIT-G-${projectRefNo || '2026-901283'}-P2`,
                        projectTitle: projectTitle,
                        projectRefNo: projectRefNo,
                        procuringEntity: procuringEntity,
                        dateTimeSubmitted: dateTimeSubmitted || 'March 19, 2026',
                        documentCategory: 'Technical Eligibility',
                        generatedBy: companyName
                      }}
                      size={55}
                      showCaption={false}
                    />
                    <div className="space-y-0.5 font-mono text-[9px] text-slate-800">
                      <p className="font-bold text-slate-950 uppercase">{companyName}</p>
                      <p>PROJECT: <strong>{projectTitle}</strong></p>
                      <p>REF NO: <strong>{projectRefNo}</strong> • PROCURING ENTITY: <strong>{procuringEntity}</strong></p>
                    </div>
                  </div>
                  <span className="font-bold font-mono">Page 2 of 2</span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 print:hidden no-export">
          <span className="text-xs text-slate-400 font-mono">
            Item {item.code} Statutory Exhibit • Accurate Inputs Loaded
          </span>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs transition">
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition flex items-center gap-2"
            >
              <FileSignature className="w-4 h-4" />
              <span>Save & Complete Exhibit</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TechnicalExhibitTemplateModal;
