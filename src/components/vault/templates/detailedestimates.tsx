import React, { useState, useEffect } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf } from '../../../utils/pdfExportEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import {
  X,
  Printer,
  Download,
  Building2,
  Plus,
  Trash2,
  Table,
  RotateCcw,
  Calculator,
  HardHat,
  PackageCheck,
  Truck,
  Users,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface MaterialEstimateRow {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface LaborEstimateRow {
  id: string;
  itemNo: string;
  description: string;
  noOfWorkers: number;
  unit: string;
  noOfDays: number;
  dailyPrice: number;
}

export interface LogisticsEstimateRow {
  id: string;
  itemNo: string;
  description: string;
  noOfVehicles: number;
  unit: string;
  noOfDays: number;
  dailyRate: number;
}

export interface EquipmentEstimateRow {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  noOfDays: number;
  dailyPrice: number;
}

export interface DetailedEstimatesModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const DetailedEstimatesModal: React.FC<DetailedEstimatesModalProps> = ({
  tenant,
  activeProjectRefNo,
  activeProjectTitle,
  activeProcuringEntity,
  onSaveAndComplete,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Opportunity Projects Auto-Fill Integration
  const [oppProjects, setOppProjects] = useState<OpportunityProjectOption[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');

  // Active Editor Section Tab
  const [activeTab, setActiveTab] = useState<'HEADER' | 'MATERIALS' | 'LABOR' | 'LOGISTICS' | 'EQUIPMENT' | 'CONTRACTOR'>('MATERIALS');

  // Header Parameters
  const [projectName, setProjectName] = useState(activeProjectTitle || 'PROCUREMENT/INSTALLATION OF CCTV CAMERAS & ELECTRICAL SYSTEM');
  const [projectLocation, setProjectLocation] = useState('BRGY. SAN ANTONIO, LOS BAÑOS, LAGUNA');
  const [ownerName, setOwnerName] = useState(activeProcuringEntity || 'BARANGAY SAN ANTONIO LOS BAÑOS LAGUNA');
  const [contractorName, setContractorName] = useState(tenant?.companyName || 'Quantum Cloud Corporation');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '2026-DET-EST-01');
  const [estimateDate, setEstimateDate] = useState(todayStr);

  // Signatory
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'Mark-Vin "cloud" F. Ocampo');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'President');

  // Profit Margin & Taxes Parameters
  const [plusItemOverhead, setPlusItemOverhead] = useState<number>(0);
  const [contractorProfit, setContractorProfit] = useState<number>(0);

  // SECTION I: MATERIALS ESTIMATE ROWS
  const [materials, setMaterials] = useState<MaterialEstimateRow[]>([
    { id: 'm-1', itemNo: '1', description: 'FIBER OPTIC 2 CORE', unit: 'Electronic', quantity: 4, unitPrice: 10000.00 },
    { id: 'm-2', itemNo: '2', description: 'FOC MEDIA CONVERTER TX RX', unit: 'Electronic', quantity: 10, unitPrice: 4500.00 },
    { id: 'm-3', itemNo: '3', description: '4MP IP CAMERA BULLET TYPE COLORED H.265+ 2.8-12MM', unit: 'Plastic', quantity: 10, unitPrice: 6500.00 },
    { id: 'm-4', itemNo: '4', description: 'SFP MODULE', unit: 'Electronic', quantity: 10, unitPrice: 2200.00 },
    { id: 'm-5', itemNo: '5', description: 'POE SPLITTER', unit: 'Electronic', quantity: 10, unitPrice: 1500.00 },
    { id: 'm-6', itemNo: '6', description: 'CCTV PANEL BOX', unit: 'Electronic', quantity: 10, unitPrice: 600.00 },
    { id: 'm-7', itemNo: '7', description: 'CCTV ELECTRICAL BOX BIG', unit: 'Electronic', quantity: 3, unitPrice: 850.00 },
    { id: 'm-8', itemNo: '8', description: '8PORT GIGABIT POE WITH SFP', unit: 'Electronic', quantity: 2, unitPrice: 5500.00 }
  ]);

  // SECTION II: LABOR COST ROWS
  const [labors, setLabors] = useState<LaborEstimateRow[]>([
    { id: 'l-1', itemNo: '1', description: 'PROJECT MANAGER', noOfWorkers: 1, unit: 'Person', noOfDays: 30, dailyPrice: 1000.00 },
    { id: 'l-2', itemNo: '2', description: 'COMMUNICATION ENGINEER', noOfWorkers: 1, unit: 'Person', noOfDays: 30, dailyPrice: 1000.00 },
    { id: 'l-3', itemNo: '3', description: 'ELECTRICAL ENGINEER', noOfWorkers: 1, unit: 'Person', noOfDays: 30, dailyPrice: 1000.00 },
    { id: 'l-4', itemNo: '4', description: 'NETWORK ENGINEER', noOfWorkers: 1, unit: 'Person', noOfDays: 15, dailyPrice: 800.00 },
    { id: 'l-5', itemNo: '5', description: 'NETWORK TECHNICIAN', noOfWorkers: 2, unit: 'Person', noOfDays: 30, dailyPrice: 1000.00 }
  ]);

  // SECTION III: LOGISTICS & MOBILIZATION ROWS
  const [logistics, setLogistics] = useState<LogisticsEstimateRow[]>([
    { id: 'log-1', itemNo: '1', description: 'FB VAN MOBILIZATION & DEMOBILIZATION OF MATERIALS', noOfVehicles: 1, unit: 'Vehicle', noOfDays: 2, dailyRate: 44973.50 }
  ]);

  // SECTION IV: EQUIPMENT RENTAL ESTIMATES ROWS
  const [equipments, setEquipments] = useState<EquipmentEstimateRow[]>([]);
  const [noEquipmentNeeded, setNoEquipmentNeeded] = useState(true);

  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    if (activeProjectRefNo) {
      const match = list.find(p => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        setProjectRefNo(match.refNo);
        setProjectName(match.title);
        setOwnerName(match.procuringEntity);
      } else {
        setProjectRefNo(activeProjectRefNo);
        if (activeProjectTitle) setProjectName(activeProjectTitle);
        if (activeProcuringEntity) setOwnerName(activeProcuringEntity);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      setProjectRefNo(first.refNo);
      setProjectName(first.title);
      setOwnerName(first.procuringEntity);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setContractorName(tenant.companyName);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
      if (tenant.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);
    }
  }, [tenant]);

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      setProjectRefNo(found.refNo);
      setProjectName(found.title);
      setOwnerName(found.procuringEntity);
    }
  };

  // Materials Row Manipulations
  const handleAddMaterial = () => {
    setActiveTab('MATERIALS');
    const nextNo = materials.length + 1;
    setMaterials(prev => [
      ...prev,
      { id: `m-${Date.now()}`, itemNo: `${nextNo}`, description: '', unit: 'Pcs', quantity: 1, unitPrice: 0 }
    ]);
  };
  const handleRemoveMaterial = (id: string) => setMaterials(prev => prev.filter(m => m.id !== id));
  const handleUpdateMaterial = (id: string, field: keyof MaterialEstimateRow, val: any) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  // Labor Row Manipulations
  const handleAddLabor = () => {
    setActiveTab('LABOR');
    const nextNo = labors.length + 1;
    setLabors(prev => [
      ...prev,
      { id: `l-${Date.now()}`, itemNo: `${nextNo}`, description: '', noOfWorkers: 1, unit: 'Person', noOfDays: 1, dailyPrice: 0 }
    ]);
  };
  const handleRemoveLabor = (id: string) => setLabors(prev => prev.filter(l => l.id !== id));
  const handleUpdateLabor = (id: string, field: keyof LaborEstimateRow, val: any) => {
    setLabors(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  // Logistics & Mobilization Row Manipulations
  const handleAddLogistics = () => {
    setActiveTab('LOGISTICS');
    const nextNo = logistics.length + 1;
    setLogistics(prev => [
      ...prev,
      { id: `log-${Date.now()}`, itemNo: `${nextNo}`, description: 'MOBILIZATION & DEMOBILIZATION OF MATERIALS / VEHICLE', noOfVehicles: 1, unit: 'Vehicle', noOfDays: 1, dailyRate: 0 }
    ]);
  };
  const handleRemoveLogistics = (id: string) => setLogistics(prev => prev.filter(lg => lg.id !== id));
  const handleUpdateLogistics = (id: string, field: keyof LogisticsEstimateRow, val: any) => {
    setLogistics(prev => prev.map(lg => lg.id === id ? { ...lg, [field]: val } : lg));
  };

  // Equipment Row Manipulations
  const handleAddEquipment = () => {
    setActiveTab('EQUIPMENT');
    setNoEquipmentNeeded(false);
    const nextNo = equipments.length + 1;
    setEquipments(prev => [
      ...prev,
      { id: `e-${Date.now()}`, itemNo: `${nextNo}`, description: '', unit: 'Unit', noOfDays: 1, dailyPrice: 0 }
    ]);
  };
  const handleRemoveEquipment = (id: string) => setEquipments(prev => prev.filter(e => e.id !== id));
  const handleUpdateEquipment = (id: string, field: keyof EquipmentEstimateRow, val: any) => {
    setEquipments(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e));
  };

  const handleResetToCleanSlate = () => {
    setMaterials([]);
    setLabors([]);
    setLogistics([]);
    setEquipments([]);
    setNoEquipmentNeeded(true);
    setPlusItemOverhead(0);
    setContractorProfit(0);
    setActiveTab('MATERIALS');
  };

  // Calculation Formula Mechanics
  const computeMaterialTotal = (m: MaterialEstimateRow) => (m.quantity || 0) * (m.unitPrice || 0);
  const totalMaterialsCost = materials.reduce((sum, m) => sum + computeMaterialTotal(m), 0);

  const computeLaborTotal = (l: LaborEstimateRow) => (l.noOfWorkers || 0) * (l.noOfDays || 0) * (l.dailyPrice || 0);
  const totalLaborCost = labors.reduce((sum, l) => sum + computeLaborTotal(l), 0);

  const computeLogisticsTotal = (lg: LogisticsEstimateRow) => (lg.noOfVehicles || 0) * (lg.noOfDays || 0) * (lg.dailyRate || 0);
  const totalLogisticsCost = logistics.reduce((sum, lg) => sum + computeLogisticsTotal(lg), 0);

  const computeEquipmentTotal = (e: EquipmentEstimateRow) => (e.noOfDays || 0) * (e.dailyPrice || 0);
  const totalEquipmentCost = noEquipmentNeeded ? 0 : equipments.reduce((sum, e) => sum + computeEquipmentTotal(e), 0);

  const totalEstimatedProjectCost = totalMaterialsCost + totalLaborCost + totalLogisticsCost + totalEquipmentCost;

  // Taxes Breakdown
  const vat12 = totalEstimatedProjectCost * 0.12;
  const withholdingTax5 = totalEstimatedProjectCost * 0.05;
  const retention1 = totalEstimatedProjectCost * 0.01;
  const serviceRendered2 = totalEstimatedProjectCost * 0.02;
  const totalTax = vat12 + withholdingTax5 + retention1 + serviceRendered2;
  const expectedChequeAmount = totalEstimatedProjectCost - totalTax;

  // Contractor Breakdown Box
  const grandTotalBid = totalEstimatedProjectCost + plusItemOverhead + contractorProfit;

  const fmtPeso = (val: number): string => {
    if (val === 0) return '0.00';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExportPdf = async () => {
    const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Detailed_Estimates.pdf`;
    const templateElems = document.querySelectorAll('.detailed-estimates-paper');
    if (templateElems.length > 0) {
      const elemArray = Array.from(templateElems) as HTMLElement[];
      await generateAndDownloadThreeLayerPdf(null, elemArray, undefined, fileName);
      if (onSaveAndComplete) {
        onSaveAndComplete(undefined, fileName, projectRefNo, projectName);
      }
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      {/* LANDSCAPE LEGAL 13" x 8.5" PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: 13in 8.5in landscape;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .detailed-estimates-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.4in !important;
            width: 13in !important;
            min-h: 8.5in !important;
            page-break-after: always !important;
          }
          .detailed-estimates-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>(L) Duly Accomplished Detailed Estimates Form</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  Statutory Form (L)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Legal 13" × 8.5" Landscape
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Summary Sheet Indicating Unit Prices of Materials, Labor Rates, Logistics/Mobilization, Equipment & Tax Breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal 13"×8.5"</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body & Paper Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* Interactive Form Controls & Tabbed Line Item Editors */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <label className="block text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Interactive Data Input Panel:</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleResetToCleanSlate}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clean Slate</span>
                </button>

                <button
                  onClick={handleAddMaterial}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition flex items-center gap-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Material</span>
                </button>

                <button
                  onClick={handleAddLabor}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center gap-1 shadow"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>+ Add Labor</span>
                </button>

                <button
                  onClick={handleAddLogistics}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition flex items-center gap-1 shadow"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>+ Add Logistics</span>
                </button>

                <button
                  onClick={handleAddEquipment}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition flex items-center gap-1 shadow"
                >
                  <HardHat className="w-3.5 h-3.5" />
                  <span>+ Add Rental Equipment</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs for Editors */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
              <button
                onClick={() => setActiveTab('HEADER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 border ${
                  activeTab === 'HEADER'
                    ? 'bg-slate-800 text-white border-slate-700 shadow'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>1. Header Info</span>
              </button>

              <button
                onClick={() => setActiveTab('MATERIALS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 border ${
                  activeTab === 'MATERIALS'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Materials ({materials.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('LABOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 border ${
                  activeTab === 'LABOR'
                    ? 'bg-blue-950 text-blue-300 border-blue-700 shadow'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>3. Labor ({labors.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('LOGISTICS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 border ${
                  activeTab === 'LOGISTICS'
                    ? 'bg-amber-950 text-amber-300 border-amber-700 shadow'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                <span>4. Logistics ({logistics.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('EQUIPMENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 border ${
                  activeTab === 'EQUIPMENT'
                    ? 'bg-purple-950 text-purple-300 border-purple-700 shadow'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <HardHat className="w-3.5 h-3.5 text-purple-400" />
                <span>5. Rentals ({noEquipmentNeeded ? 0 : equipments.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('CONTRACTOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 border ${
                  activeTab === 'CONTRACTOR'
                    ? 'bg-slate-800 text-purple-300 border-purple-700 shadow'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-purple-400" />
                <span>6. Profit & Overhead</span>
              </button>
            </div>

            {/* TAB 1: HEADER & PROJECT METADATA */}
            {activeTab === 'HEADER' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                <div className="col-span-full">
                  <label className="block text-slate-300 font-mono mb-1 font-bold">
                    Select Active Bidding Opportunity from Opportunity Finder:
                  </label>
                  <select
                    value={selectedOppId}
                    onChange={(e) => handleSelectOpportunity(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-500/60 rounded-xl px-3.5 py-2 text-white font-mono text-xs font-bold focus:outline-none focus:border-purple-400 shadow-inner cursor-pointer"
                  >
                    <option value="">-- Custom Inputs --</option>
                    {oppProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.refNo}] {p.title} — {p.procuringEntity} ({p.abc})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Project Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. PROCUREMENT/INSTALLATION OF CCTV..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Location of Project <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    placeholder="e.g. PUROK 1-6 BRGY. SAN ANTONIO, LOS BAÑOS, LAGUNA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Owner / Procuring Entity <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. BARANGAY SAN ANTONIO LOS BAÑOS LAGUNA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Contractor's Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="e.g. Quantum Cloud Corporation"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Project Reference No. <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={projectRefNo}
                    onChange={(e) => setProjectRefNo(e.target.value)}
                    placeholder="e.g. 2026-DET-EST-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Date of Estimate</label>
                  <input
                    type="date"
                    value={estimateDate}
                    onChange={(e) => setEstimateDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: MATERIALS ESTIMATE INTERACTIVE INPUT EDITOR */}
            {activeTab === 'MATERIALS' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-emerald-400 font-bold uppercase">
                    Section I. Materials Estimate Input Rows ({materials.length} Items):
                  </label>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Subtotal: ₱{fmtPeso(totalMaterialsCost)}
                  </span>
                </div>

                {materials.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
                    No material items added yet. Click "+ Add Material" above to add line items.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {materials.map((m, idx) => (
                      <div key={m.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                        <div className="col-span-1 text-center font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={m.description}
                            onChange={(e) => handleUpdateMaterial(m.id, 'description', e.target.value)}
                            placeholder="Material Description (e.g., FIBER OPTIC 2 CORE)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-medium focus:border-emerald-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={m.unit}
                            onChange={(e) => handleUpdateMaterial(m.id, 'unit', e.target.value)}
                            placeholder="Unit (e.g., Lot, Pcs)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={m.quantity || ''}
                            onChange={(e) => handleUpdateMaterial(m.id, 'quantity', parseFloat(e.target.value) || 0)}
                            placeholder="QTY"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={m.unitPrice || ''}
                            onChange={(e) => handleUpdateMaterial(m.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            placeholder="Unit Price (₱)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-emerald-400 text-right font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(m.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition"
                            title="Remove Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LABOR COST INTERACTIVE INPUT EDITOR */}
            {activeTab === 'LABOR' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-blue-400 font-bold uppercase">
                    Section II. Labor Cost Input Rows ({labors.length} Items):
                  </label>
                  <span className="text-xs font-mono text-blue-400 font-bold">
                    Subtotal: ₱{fmtPeso(totalLaborCost)}
                  </span>
                </div>

                {labors.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
                    No labor items added yet. Click "+ Add Labor" above to add personnel items.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {labors.map((l, idx) => (
                      <div key={l.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                        <div className="col-span-1 text-center font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={l.description}
                            onChange={(e) => handleUpdateLabor(l.id, 'description', e.target.value)}
                            placeholder="Designation (e.g. PROJECT MANAGER)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-medium focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={l.noOfWorkers || ''}
                            onChange={(e) => handleUpdateLabor(l.id, 'noOfWorkers', parseInt(e.target.value) || 0)}
                            placeholder="No. Workers"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={l.unit}
                            onChange={(e) => handleUpdateLabor(l.id, 'unit', e.target.value)}
                            placeholder="Unit (Person)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={l.noOfDays || ''}
                            onChange={(e) => handleUpdateLabor(l.id, 'noOfDays', parseInt(e.target.value) || 0)}
                            placeholder="Days"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-1 font-mono">
                          <input
                            type="number"
                            value={l.dailyPrice || ''}
                            onChange={(e) => handleUpdateLabor(l.id, 'dailyPrice', parseFloat(e.target.value) || 0)}
                            placeholder="Daily (₱)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-blue-400 text-right font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveLabor(l.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition"
                            title="Remove Labor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: LOGISTICS & MOBILIZATION INTERACTIVE INPUT EDITOR */}
            {activeTab === 'LOGISTICS' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-amber-400 font-bold uppercase">
                    Section III. Logistics & Mobilization Input Rows ({logistics.length} Items):
                  </label>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    Subtotal: ₱{fmtPeso(totalLogisticsCost)}
                  </span>
                </div>

                {logistics.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
                    No logistics or mobilization items added yet. Click "+ Add Logistics" above to add vehicle/transport items.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {logistics.map((lg, idx) => (
                      <div key={lg.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                        <div className="col-span-1 text-center font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={lg.description}
                            onChange={(e) => handleUpdateLogistics(lg.id, 'description', e.target.value)}
                            placeholder="Description (e.g. FB VAN MOBILIZATION)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-medium focus:border-amber-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={lg.noOfVehicles || ''}
                            onChange={(e) => handleUpdateLogistics(lg.id, 'noOfVehicles', parseInt(e.target.value) || 0)}
                            placeholder="No. Vehicles"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={lg.unit}
                            onChange={(e) => handleUpdateLogistics(lg.id, 'unit', e.target.value)}
                            placeholder="Unit (Vehicle)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={lg.noOfDays || ''}
                            onChange={(e) => handleUpdateLogistics(lg.id, 'noOfDays', parseInt(e.target.value) || 0)}
                            placeholder="Days"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            value={lg.dailyRate || ''}
                            onChange={(e) => handleUpdateLogistics(lg.id, 'dailyRate', parseFloat(e.target.value) || 0)}
                            placeholder="Rate (₱)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-amber-400 text-right font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveLogistics(lg.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition"
                            title="Remove Logistics Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: EQUIPMENT RENTAL ESTIMATES INTERACTIVE INPUT EDITOR */}
            {activeTab === 'EQUIPMENT' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="block text-xs font-mono text-purple-400 font-bold uppercase">
                      Section IV. Equipment Rental Inputs ({equipments.length} Items):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="noEquipmentCheck"
                        checked={noEquipmentNeeded}
                        onChange={(e) => setNoEquipmentNeeded(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="noEquipmentCheck" className="text-xs text-slate-300 cursor-pointer">
                        No Heavy Equipment Needed
                      </label>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-purple-400 font-bold">
                    Subtotal: ₱{fmtPeso(totalEquipmentCost)}
                  </span>
                </div>

                {noEquipmentNeeded ? (
                  <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono uppercase font-bold">
                    NO EQUIPMENT NEEDED NO HEAVY EQUIPMENT RENTALS
                  </div>
                ) : equipments.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
                    No rental equipment added yet. Click "+ Add Rental Equipment" above to add line items.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {equipments.map((e, idx) => (
                      <div key={e.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                        <div className="col-span-1 text-center font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={e.description}
                            onChange={(ev) => handleUpdateEquipment(e.id, 'description', ev.target.value)}
                            placeholder="Equipment Description (e.g., EXCAVATOR / BOOM TRUCK)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-medium focus:border-purple-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={e.unit}
                            onChange={(ev) => handleUpdateEquipment(e.id, 'unit', ev.target.value)}
                            placeholder="Unit (Unit, Set)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={e.noOfDays || ''}
                            onChange={(ev) => handleUpdateEquipment(e.id, 'noOfDays', parseInt(ev.target.value) || 0)}
                            placeholder="Days"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={e.dailyPrice || ''}
                            onChange={(ev) => handleUpdateEquipment(e.id, 'dailyPrice', parseFloat(ev.target.value) || 0)}
                            placeholder="Daily Price (₱)"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-purple-400 text-right font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveEquipment(e.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition"
                            title="Remove Equipment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: CONTRACTOR PROFIT & OVERHEAD INPUTS */}
            {activeTab === 'CONTRACTOR' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PLUST ITEM / Overhead Amount (₱)</label>
                  <input
                    type="number"
                    value={plusItemOverhead || ''}
                    onChange={(e) => setPlusItemOverhead(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">CONTRACTOR PROFIT Amount (₱)</label>
                  <input
                    type="number"
                    value={contractorProfit || ''}
                    onChange={(e) => setContractorProfit(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>
            )}

          </div>

          {/* EXACT LEGAL LANDSCAPE PAPER LAYOUT PREVIEW (SF-INFR / FORM L) */}
          <div className="space-y-8 flex flex-col items-center">

            <div className="detailed-estimates-paper single-page-paper w-[13in] min-h-[8.5in] bg-white text-slate-950 p-[0.4in] shadow-2xl font-sans text-[8.5pt] leading-tight flex flex-col justify-between mx-auto border border-slate-300">
              <div className="space-y-3">
                
                {/* Main Statutory Header Box */}
                <div className="border-2 border-slate-950">
                  <div className="bg-slate-100 p-1.5 text-center font-extrabold text-[9pt] border-b-2 border-slate-950">
                    (L) Duly accomplished Detailed Estimates Form, including a summary sheet indicating the unit prices of materials, labor rates, and equipment rentals used in coming up with the Bid;
                  </div>
                  
                  <div className="grid grid-cols-12 text-[8.5pt] font-sans">
                    <div className="col-span-8 border-r-2 border-slate-950 p-1 space-y-0.5">
                      <p><strong>Project Name:</strong> <span className="uppercase font-bold">{projectName}</span></p>
                      <p><strong>Location:</strong> {projectLocation}</p>
                      <p><strong>Owner:</strong> <span className="uppercase">{ownerName}</span></p>
                      <p><strong>Contractor's Name:</strong> <span className="font-bold uppercase">{contractorName}</span></p>
                      <p><strong>Date:</strong> <span className="font-mono">{estimateDate ? new Date(estimateDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : ''}</span></p>
                    </div>
                    <div className="col-span-4 p-1 flex items-center justify-center bg-slate-50 font-mono text-[8pt] text-slate-700">
                      REF NO: {projectRefNo || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Sub Title */}
                <div className="text-center font-extrabold text-[9.5pt] uppercase py-0.5 bg-slate-100 border-x-2 border-b-2 border-slate-950">
                  DETAILED ESTIMATES FORM
                </div>

                {/* SECTION I: MATERIALS ESTIMATE TABLE */}
                <div className="space-y-1">
                  <div className="font-bold text-[8.5pt] uppercase">I. MATERIALS ESTIMATE</div>
                  <table className="w-full border-collapse border-2 border-slate-950 text-[8pt] font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-950 text-center font-bold">
                        <th className="border border-slate-950 p-1 w-10">Item</th>
                        <th className="border border-slate-950 p-1 text-left">Description</th>
                        <th className="border border-slate-950 p-1 w-20">Unit</th>
                        <th className="border border-slate-950 p-1 w-14">QTY.</th>
                        <th className="border border-slate-950 p-1 w-24">Unit Price</th>
                        <th className="border border-slate-950 p-1 w-28">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border border-slate-950 p-1 text-center font-mono text-slate-500">
                            (No material items listed)
                          </td>
                        </tr>
                      ) : (
                        materials.map((m) => {
                          const rowTotal = computeMaterialTotal(m);
                          return (
                            <tr key={m.id} className="border-b border-slate-950">
                              <td className="border border-slate-950 p-1 text-center font-bold font-mono">{m.itemNo}</td>
                              <td className="border border-slate-950 p-1 font-medium">{m.description || '-'}</td>
                              <td className="border border-slate-950 p-1 text-center">{m.unit}</td>
                              <td className="border border-slate-950 p-1 text-center font-mono font-bold">{m.quantity}</td>
                              <td className="border border-slate-950 p-1 text-right font-mono">{fmtPeso(m.unitPrice)}</td>
                              <td className="border border-slate-950 p-1 text-right font-mono font-bold">{fmtPeso(rowTotal)}</td>
                            </tr>
                          );
                        })
                      )}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-950">
                        <td colSpan={5} className="border border-slate-950 p-1 text-right font-extrabold uppercase">
                          TOTAL MATERIALS COST
                        </td>
                        <td className="border border-slate-950 p-1 text-right font-mono font-extrabold text-[8.5pt]">
                          ₱{fmtPeso(totalMaterialsCost)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* SECTION II: LABOR COST TABLE (PURE LABOR ONLY) */}
                <div className="space-y-1 pt-1">
                  <div className="font-bold text-[8.5pt] uppercase">II. LABOR COST</div>
                  <table className="w-full border-collapse border-2 border-slate-950 text-[8pt] font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-950 text-center font-bold">
                        <th className="border border-slate-950 p-1 w-10">Item</th>
                        <th className="border border-slate-950 p-1 text-left">DESCRIPTION</th>
                        <th className="border border-slate-950 p-1 w-24">No. of worker</th>
                        <th className="border border-slate-950 p-1 w-20">Unit</th>
                        <th className="border border-slate-950 p-1 w-20">No. of Days</th>
                        <th className="border border-slate-950 p-1 w-24">DailyPrice</th>
                        <th className="border border-slate-950 p-1 w-28">Total Labor cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labors.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-slate-950 p-1 text-center font-mono text-slate-500">
                            (No labor items listed)
                          </td>
                        </tr>
                      ) : (
                        labors.map((l) => {
                          const rowTotal = computeLaborTotal(l);
                          return (
                            <tr key={l.id} className="border-b border-slate-950">
                              <td className="border border-slate-950 p-1 text-center font-bold font-mono">{l.itemNo}</td>
                              <td className="border border-slate-950 p-1 font-medium">{l.description || '-'}</td>
                              <td className="border border-slate-950 p-1 text-center font-mono">{l.noOfWorkers}</td>
                              <td className="border border-slate-950 p-1 text-center">{l.unit}</td>
                              <td className="border border-slate-950 p-1 text-center font-mono">{l.noOfDays}</td>
                              <td className="border border-slate-950 p-1 text-right font-mono">{fmtPeso(l.dailyPrice)}</td>
                              <td className="border border-slate-950 p-1 text-right font-mono font-bold">{fmtPeso(rowTotal)}</td>
                            </tr>
                          );
                        })
                      )}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-950">
                        <td colSpan={6} className="border border-slate-950 p-1 text-right font-extrabold uppercase">
                          TOTAL LABOR COST
                        </td>
                        <td className="border border-slate-950 p-1 text-right font-mono font-extrabold text-[8.5pt]">
                          ₱{fmtPeso(totalLaborCost)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* SECTION III: LOGISTICS & MOBILIZATION TABLE */}
                <div className="space-y-1 pt-1">
                  <div className="font-bold text-[8.5pt] uppercase text-amber-900">III. LOGISTICS & MOBILIZATION</div>
                  <table className="w-full border-collapse border-2 border-slate-950 text-[8pt] font-sans">
                    <thead>
                      <tr className="bg-amber-50/80 border-b-2 border-slate-950 text-center font-bold">
                        <th className="border border-slate-950 p-1 w-10">Item</th>
                        <th className="border border-slate-950 p-1 text-left">DESCRIPTION</th>
                        <th className="border border-slate-950 p-1 w-24">No. of Vehicle</th>
                        <th className="border border-slate-950 p-1 w-20">Unit</th>
                        <th className="border border-slate-950 p-1 w-20">No. of Days</th>
                        <th className="border border-slate-950 p-1 w-24">Daily Rate</th>
                        <th className="border border-slate-950 p-1 w-28">Total Logistics Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logistics.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-slate-950 p-1 text-center font-mono text-slate-500">
                            (No logistics or mobilization items listed)
                          </td>
                        </tr>
                      ) : (
                        logistics.map((lg) => {
                          const rowTotal = computeLogisticsTotal(lg);
                          return (
                            <tr key={lg.id} className="border-b border-slate-950">
                              <td className="border border-slate-950 p-1 text-center font-bold font-mono">{lg.itemNo}</td>
                              <td className="border border-slate-950 p-1 font-medium">{lg.description || '-'}</td>
                              <td className="border border-slate-950 p-1 text-center font-mono">{lg.noOfVehicles}</td>
                              <td className="border border-slate-950 p-1 text-center">{lg.unit}</td>
                              <td className="border border-slate-950 p-1 text-center font-mono">{lg.noOfDays}</td>
                              <td className="border border-slate-950 p-1 text-right font-mono">{fmtPeso(lg.dailyRate)}</td>
                              <td className="border border-slate-950 p-1 text-right font-mono font-bold">{fmtPeso(rowTotal)}</td>
                            </tr>
                          );
                        })
                      )}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-950">
                        <td colSpan={6} className="border border-slate-950 p-1 text-right font-extrabold uppercase">
                          TOTAL LOGISTICS & MOBILIZATION COST
                        </td>
                        <td className="border border-slate-950 p-1 text-right font-mono font-extrabold text-[8.5pt]">
                          ₱{fmtPeso(totalLogisticsCost)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* SECTION IV: EQUIPMENT RENTAL ESTIMATES */}
                <div className="space-y-1 pt-1">
                  <div className="font-bold text-[8.5pt] uppercase">IV. EQUIPMENT RENTAL ESTIMATES</div>
                  <table className="w-full border-collapse border-2 border-slate-950 text-[8pt] font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-950 text-center font-bold">
                        <th className="border border-slate-950 p-1 w-10">Item</th>
                        <th className="border border-slate-950 p-1 text-left">DESCRIPTION</th>
                        <th className="border border-slate-950 p-1 w-20">Unit</th>
                        <th className="border border-slate-950 p-1 w-20">No. of Days</th>
                        <th className="border border-slate-950 p-1 w-24">Daily Price</th>
                        <th className="border border-slate-950 p-1 w-28">Total Rent cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noEquipmentNeeded ? (
                        <tr>
                          <td colSpan={6} className="border border-slate-950 p-1.5 text-center font-bold text-slate-700 uppercase">
                            NO EQUIPMENT NEEDED NO HEAVY EQUIPMENT RENTALS
                          </td>
                        </tr>
                      ) : equipments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border border-slate-950 p-1 text-center font-mono text-slate-500">
                            (No rental equipment listed)
                          </td>
                        </tr>
                      ) : (
                        equipments.map((e) => {
                          const rowTotal = computeEquipmentTotal(e);
                          return (
                            <tr key={e.id} className="border-b border-slate-950">
                              <td className="border border-slate-950 p-1 text-center font-bold font-mono">{e.itemNo}</td>
                              <td className="border border-slate-950 p-1 font-medium">{e.description || '-'}</td>
                              <td className="border border-slate-950 p-1 text-center">{e.unit}</td>
                              <td className="border border-slate-950 p-1 text-center font-mono">{e.noOfDays}</td>
                              <td className="border border-slate-950 p-1 text-right font-mono">{fmtPeso(e.dailyPrice)}</td>
                              <td className="border border-slate-950 p-1 text-right font-mono font-bold">{fmtPeso(rowTotal)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* SECTION V & TAXES & SUMMARY BOX GRID */}
                <div className="grid grid-cols-12 gap-4 pt-1">
                  
                  {/* Left Column: Summary Sheet & Tax Table */}
                  <div className="col-span-7 space-y-3">
                    
                    {/* SECTION V: SUMMARY SHEET */}
                    <div>
                      <div className="font-bold text-[8.5pt] uppercase mb-1">V. SUMMARY SHEET</div>
                      <table className="w-full border-collapse border-2 border-slate-950 text-[8pt] font-sans">
                        <tbody>
                          <tr className="border-b border-slate-950">
                            <td className="p-1 font-semibold">Total Materials Cost</td>
                            <td className="p-1 text-right font-mono font-bold w-36">₱{fmtPeso(totalMaterialsCost)}</td>
                          </tr>
                          <tr className="border-b border-slate-950">
                            <td className="p-1 font-semibold">Total Labor Cost</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(totalLaborCost)}</td>
                          </tr>
                          <tr className="border-b border-slate-950 bg-amber-50/50">
                            <td className="p-1 font-semibold text-amber-950">Total Logistics & Mobilization Cost</td>
                            <td className="p-1 text-right font-mono font-bold text-amber-950">₱{fmtPeso(totalLogisticsCost)}</td>
                          </tr>
                          <tr className="border-b border-slate-950">
                            <td className="p-1 font-semibold">Total Equipment Rental Cost</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(totalEquipmentCost)}</td>
                          </tr>
                          <tr className="bg-slate-100 font-bold text-[8.5pt]">
                            <td className="p-1.5 uppercase font-extrabold">Total Estimated Project Cost:</td>
                            <td className="p-1.5 text-right font-mono font-extrabold text-slate-950">₱{fmtPeso(totalEstimatedProjectCost)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* TAXES TABLE */}
                    <div>
                      <div className="font-bold text-[8.5pt] uppercase text-red-700 mb-1">TAXES & DEDUCTIONS STATEMENT</div>
                      <table className="w-full border-collapse border-2 border-slate-950 text-[8pt] font-sans">
                        <tbody>
                          <tr className="border-b border-slate-950">
                            <td className="p-1">VAT 12%</td>
                            <td className="p-1 text-right font-mono font-bold w-36">₱{fmtPeso(vat12)}</td>
                          </tr>
                          <tr className="border-b border-slate-950">
                            <td className="p-1">Withholding Tax 5%</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(withholdingTax5)}</td>
                          </tr>
                          <tr className="border-b border-slate-950">
                            <td className="p-1">Retention 1%</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(retention1)}</td>
                          </tr>
                          <tr className="border-b border-slate-950">
                            <td className="p-1">Service rendered 2%</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(serviceRendered2)}</td>
                          </tr>
                          <tr className="bg-slate-50 border-b-2 border-slate-950 font-bold">
                            <td className="p-1 uppercase">Total Tax</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(totalTax)}</td>
                          </tr>
                          <tr className="bg-slate-100 font-extrabold text-[8.5pt]">
                            <td className="p-1.5 uppercase">Expected Cheque amount</td>
                            <td className="p-1.5 text-right font-mono font-extrabold text-slate-950">₱{fmtPeso(expectedChequeAmount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                  </div>

                  {/* Right Column: Contractor Breakdown Summary Box & Signatures */}
                  <div className="col-span-5 space-y-4 flex flex-col justify-between">
                    
                    {/* CONTRACTOR BID SUMMARY BOX */}
                    <div className="border-2 border-slate-950">
                      <div className="bg-slate-100 p-1 text-center font-bold text-[8.5pt] uppercase border-b-2 border-slate-950">
                        CONTRACTOR BID BREAKDOWN SUMMARY
                      </div>
                      <table className="w-full border-collapse text-[8pt] font-sans">
                        <tbody>
                          <tr className="border-b border-slate-950">
                            <td className="p-1 font-bold">MATERIALS</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(totalMaterialsCost)}</td>
                          </tr>
                          <tr className="border-b border-slate-950">
                            <td className="p-1 font-bold">LABOR</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(totalLaborCost)}</td>
                          </tr>
                          <tr className="border-b border-slate-950 bg-amber-50/50">
                            <td className="p-1 font-bold text-amber-950">LOGISTICS & MOBILIZATION</td>
                            <td className="p-1 text-right font-mono font-bold text-amber-950">₱{fmtPeso(totalLogisticsCost)}</td>
                          </tr>
                          <tr className="border-b border-slate-950">
                            <td className="p-1">PLUST ITEM</td>
                            <td className="p-1 text-right font-mono">{fmtPeso(plusItemOverhead)}</td>
                          </tr>
                          <tr className="border-b border-slate-950">
                            <td className="p-1">CONTRACTOR PROFIT</td>
                            <td className="p-1 text-right font-mono">{fmtPeso(contractorProfit)}</td>
                          </tr>
                          <tr className="border-b-2 border-slate-950">
                            <td className="p-1">VAT</td>
                            <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(vat12)}</td>
                          </tr>
                          <tr className="bg-slate-100 font-extrabold text-[9pt]">
                            <td className="p-1.5 uppercase font-black">TOTAL BID</td>
                            <td className="p-1.5 text-right font-mono font-black text-slate-950">₱{fmtPeso(grandTotalBid)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* SIGNATURE BLOCK */}
                    <div className="space-y-1.5 text-[8.5pt]">
                      <p className="font-bold text-slate-950">Signatures:</p>
                      
                      <div className="pt-2 space-y-1">
                        <p><strong>Prepared by:</strong> <span className="font-bold border-b border-slate-950 pb-0.5">{signatoryName || '____________________'}</span></p>
                        <p><strong>Position:</strong> <span className="border-b border-slate-950 pb-0.5">{signatoryTitle || '____________________'}</span></p>
                        <p className="font-bold uppercase pt-0.5">{contractorName || '____________________'}</p>
                        <p><strong>Date:</strong> <span className="font-mono">{estimateDate ? new Date(estimateDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '____________________'}</span></p>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Document Footer */}
              <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[8pt] font-mono text-slate-700">
                <div className="flex items-center gap-3">
                  <DocumentQrCode
                    details={{
                      companyName: contractorName || 'Bidding Entity',
                      documentName: '(L) Detailed Estimates Form',
                      documentNumber: `FIN-DETEST-${projectRefNo || 'INFRA'}`,
                      projectTitle: projectName,
                      projectRefNo: projectRefNo,
                      procuringEntity: ownerName,
                      dateTimeSubmitted: new Date().toLocaleString(),
                      documentCategory: 'Financial Documents',
                      generatedBy: contractorName || 'Bidding Entity'
                    }}
                    size={40}
                    showCaption={false}
                  />
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-950 uppercase">{contractorName || 'BIDDING ENTITY'}</p>
                    <p>PROJECT: <strong>{projectName || 'N/A'}</strong></p>
                    <p>REF NO: <strong>{projectRefNo || 'N/A'}</strong> • OWNER: <strong>{ownerName || 'N/A'}</strong></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono">Page 1 of 1</span>
                  <p className="text-[7pt] text-slate-500">Statutory Form (L) Detailed Estimates</p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 sticky bottom-0 z-10 shrink-0 no-print">
          <div className="text-xs font-mono text-slate-400">
            Total Estimated Project Cost: <span className="text-purple-400 font-bold font-mono text-sm">₱ {fmtPeso(totalEstimatedProjectCost)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExportPdf}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save & Complete Detailed Estimates Form</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Default export alias
export default DetailedEstimatesModal;
