import React, { useState, useEffect, useMemo } from 'react';
import { Tenant } from '../../../types';
import { generateAndDownloadThreeLayerPdf, generateThreeLayerPdfDataUrl } from '../../../utils/pdfExportEngine';
import { autoFitPageChunks, calculateRowHeight } from '../../../utils/autoFitEngine';
import { getOpportunityProjects, OpportunityProjectOption } from '../../../utils/opportunityProjects';
import DocumentQrCode from '../../common/DocumentQrCode';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import { numberToWords } from '../../../utils/numberToWords';
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
  RefreshCw,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Calendar,
  MapPin,
  FileCode,
  DollarSign,
  FolderKanban,
  FileSignature
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

const fmtPeso = (val: number): string => {
  if (val === 0 || isNaN(val)) return '0.00';
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const EditableCurrencyCell: React.FC<{
  value: number | string | undefined;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  title?: string;
  pesoColor?: string;
}> = ({ value, onChange, className = '', placeholder = '0.00', title = 'Click to edit rate', pesoColor = 'text-slate-400' }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [tempVal, setTempVal] = useState<string>('');

  const numVal = typeof value === 'number'
    ? (isNaN(value) ? 0 : value)
    : value
      ? parseFloat(`${value}`.replace(/,/g, '')) || 0
      : 0;

  const displayVal = isFocused
    ? tempVal
    : (numVal > 0)
      ? numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : (numVal === 0 ? '0.00' : '');

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setTempVal(numVal > 0 ? `${numVal}` : '');
    e.target.select();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTempVal(raw);
    const clean = parseFloat(raw.replace(/,/g, ''));
    onChange(isNaN(clean) ? 0 : clean);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className="flex items-center justify-end px-1 gap-0.5">
      <span className={`text-[6.5pt] font-sans ${pesoColor}`}>₱</span>
      <input
        type="text"
        inputMode="decimal"
        value={displayVal}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        title={title}
      />
    </div>
  );
};

export const DetailedEstimatesModalContent: React.FC<DetailedEstimatesModalProps> = ({
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
  const [activeTab, setActiveTab] = useState<'HEADER' | 'MATERIALS' | 'LABOR' | 'LOGISTICS' | 'EQUIPMENT' | 'CONFORME'>('MATERIALS');

  // Fixed Read-Only Statutory Header Metadata (Derived from Official Project Creation)
  const [projectName, setProjectName] = useState(activeProjectTitle || 'PROCUREMENT AND INSTALLATION OF CCTV AT PUROK 1-6');
  const [projectLocation, setProjectLocation] = useState('BARANGAY TUNTUNGAN PUTO, LOS BAÑOS, LAGUNA');
  const [ownerName, setOwnerName] = useState(activeProcuringEntity || 'BARANGAY TUNTUNGAN PUTO, LOS BAÑOS, LAGUNA');
  const [contractorName, setContractorName] = useState(tenant?.companyName || 'Quantum Cloud Corporation');
  const [companyAddress, setCompanyAddress] = useState(tenant?.address || 'Los Baños, Laguna');
  const [projectRefNo, setProjectRefNo] = useState(activeProjectRefNo || '2026-DET-EST-01');
  const [solicitationNumber, setSolicitationNumber] = useState('SOL-2026-001');
  const [estimateDate, setEstimateDate] = useState(todayStr);

  // Signatory & Conforme Parameters (100% Automated from Tenant Company Profile & Section VI/VII)
  const [signatoryName, setSignatoryName] = useState(tenant?.authorizedSignatory?.name || 'MARK-VIN F. OCAMPO');
  const [signatoryTitle, setSignatoryTitle] = useState(tenant?.authorizedSignatory?.title || 'PRESIDENT');
  const [bidSecurityType, setBidSecurityType] = useState('BID SECURING DECLARATION');
  const [bidSecurityAmount, setBidSecurityAmount] = useState<number>(0);
  const [deliverySchedule, setDeliverySchedule] = useState('30 Calendar Days upon receipt of NTP');
  const [businessRegType, setBusinessRegType] = useState<'SEC' | 'DTI' | 'CDA' | 'SEC_DTI'>('SEC');


  // Auto-detect SEC vs DTI vs CDA 100% from company profile (secDtiRegNo / companyName)
  useEffect(() => {
    if (tenant) {
      const reg = (tenant.secDtiRegNo || '').toUpperCase();
      const comp = (tenant.companyName || '').toUpperCase();

      if (reg.includes('DTI') || reg.includes('BN-') || comp.includes('ENTERPRISE') || comp.includes('TRADING')) {
        setBusinessRegType('DTI');
      } else if (reg.includes('CDA') || comp.includes('COOPERATIVE') || comp.includes('COOP')) {
        setBusinessRegType('CDA');
      } else if (reg.includes('SEC') || reg.startsWith('CS') || reg.startsWith('PG') || comp.includes('INC') || comp.includes('CORP') || comp.includes('CORPORATION')) {
        setBusinessRegType('SEC');
      } else if (reg.length > 0) {
        setBusinessRegType('SEC');
      }
    }
  }, [tenant]);

  // SECTION I: MATERIALS ESTIMATE ROWS (Auto-Synced 100% Identically from Section VII / VI)
  const [materials, setMaterials] = useState<MaterialEstimateRow[]>([]);

  // SECTION II: LABOR COST ROWS
  const [labors, setLabors] = useState<LaborEstimateRow[]>([]);

  // SECTION III: LOGISTICS & MOBILIZATION ROWS
  const [logistics, setLogistics] = useState<LogisticsEstimateRow[]>([]);

  // SECTION IV: EQUIPMENT RENTAL ESTIMATES ROWS
  const [equipments, setEquipments] = useState<EquipmentEstimateRow[]>([]);
  const [noEquipmentNeeded, setNoEquipmentNeeded] = useState(true);

  const projectScopeKey = selectedOppId || projectRefNo || activeProjectRefNo;

  // Auto-populate FIXED project header info from official project creation metadata
  const applyFixedProjectHeader = (proj: {
    refNo?: string;
    solicitationNo?: string;
    title?: string;
    procuringEntity?: string;
    location?: string;
    deliveryArea?: string;
    areaOfDelivery?: string;
    dateTimeSubmitted?: string;
  }) => {
    if (proj.title) setProjectName(proj.title);
    if (proj.procuringEntity) setOwnerName(proj.procuringEntity);
    if (proj.refNo) setProjectRefNo(proj.refNo);
    if (proj.solicitationNo) setSolicitationNumber(proj.solicitationNo);

    // Location / Area of Delivery
    const loc = proj.location || proj.deliveryArea || proj.areaOfDelivery || proj.procuringEntity || projectLocation;
    setProjectLocation(loc);

    // Date / Submission Date
    if (proj.dateTimeSubmitted) {
      const dateOnly = proj.dateTimeSubmitted.split('T')[0];
      setEstimateDate(dateOnly);
    }
  };

  // Load Opportunity Projects and lock header parameters
  useEffect(() => {
    const list = getOpportunityProjects(tenant?.id);
    setOppProjects(list);

    if (activeProjectRefNo) {
      const match = list.find(p => p.refNo === activeProjectRefNo);
      if (match) {
        setSelectedOppId(match.id);
        applyFixedProjectHeader(match);
      } else {
        setProjectRefNo(activeProjectRefNo);
        if (activeProjectTitle) setProjectName(activeProjectTitle);
        if (activeProcuringEntity) setOwnerName(activeProcuringEntity);
      }
    } else if (list.length > 0) {
      const first = list[0];
      setSelectedOppId(first.id);
      applyFixedProjectHeader(first);
    }
  }, [tenant?.id, activeProjectRefNo, activeProjectTitle, activeProcuringEntity]);

  // 100% Automated Signatory from Registered Tenant Profile
  useEffect(() => {
    if (tenant) {
      if (tenant.companyName) setContractorName(tenant.companyName);
      if (tenant.address) setCompanyAddress(tenant.address);
      if (tenant.authorizedSignatory?.name) setSignatoryName(tenant.authorizedSignatory.name);
      if (tenant.authorizedSignatory?.title) setSignatoryTitle(tenant.authorizedSignatory.title);
    }
  }, [tenant]);

  // Auto-sync items, quantities, delivery schedule AND unit prices 100% identically from SECTION VI (Schedule of Requirements)
  const syncFromSectionVIAndVII = (forceRefreshPrices: boolean = false, targetScopeKey?: string, targetOppId?: string) => {
    const scopeKey = targetScopeKey || projectRefNo || activeProjectRefNo;
    const oppKey = targetOppId || selectedOppId;
    if (!scopeKey && !oppKey) {
      setMaterials([]);
      return false;
    }
    const tenantKey = tenant?.id || 'default';
    
    // Check ONLY the specific project keys for Section VI for this project
    const secViKeys = [
      scopeKey ? `bidocs_sec_vi_${tenantKey}_${scopeKey}` : '',
      oppKey ? `bidocs_sec_vi_${tenantKey}_${oppKey}` : ''
    ].filter(Boolean);

    const techSpecsKeys = [
      scopeKey ? `bidocs_tech_specs_${tenantKey}_${scopeKey}` : '',
      oppKey ? `bidocs_tech_specs_${tenantKey}_${oppKey}` : ''
    ].filter(Boolean);

    // Load existing saved unit prices to preserve bidder inputs unless force refresh
    const detailedKey = `bidocs_detailed_estimates_${tenantKey}_${scopeKey || oppKey}`;
    let existingPricesMap = new Map<string, number>();
    if (!forceRefreshPrices) {
      const savedDet = localStorage.getItem(detailedKey);
      if (savedDet) {
        try {
          const parsed = JSON.parse(savedDet);
          if (parsed.materials && Array.isArray(parsed.materials)) {
            parsed.materials.forEach((m: any) => {
              if (m.itemNo) existingPricesMap.set(`${m.itemNo}`, m.unitPrice || 0);
              if (m.description) existingPricesMap.set(m.description.trim(), m.unitPrice || 0);
            });
          }
        } catch (e) {}
      }
    }

    // FIRST PRIORITY: Load 100% identical items directly from SECTION VI (Schedule of Requirements)
    for (const key of secViKeys) {
      const savedSecVi = localStorage.getItem(key);
      if (savedSecVi) {
        try {
          const parsed = JSON.parse(savedSecVi);
          if (Array.isArray(parsed)) {
            const mappedMaterials: MaterialEstimateRow[] = parsed.map((item: any, idx: number) => {
              const qtyStr = item.quantity || '1';
              const qtyMatch = qtyStr.match(/([\d,.]+)\s*(.*)/);
              const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(/,/g, '')) || 1 : 1;
              const unit = qtyMatch && qtyMatch[2] ? qtyMatch[2].trim() : (item.unit || 'Pcs');

              const itemNoStr = `${idx + 1}`;
              const itemDesc = (item.description || item.specification || '').trim();

              const secPriceNum = item.unitAmount
                ? parseFloat(`${item.unitAmount}`.replace(/[^0-9.]/g, '')) || 0
                : item.unitPrice
                  ? (typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(`${item.unitPrice}`.replace(/[^0-9.]/g, '')) || 0)
                  : item.unitCost
                    ? parseFloat(`${item.unitCost}`.replace(/[^0-9.]/g, '')) || 0
                    : 0;

              const savedPrice = existingPricesMap.get(itemNoStr) ?? existingPricesMap.get(itemDesc);
              const unitPriceToUse = (!forceRefreshPrices && savedPrice !== undefined && savedPrice > 0) ? savedPrice : secPriceNum;

              if (item.delivered && typeof item.delivered === 'string' && item.delivered.trim()) {
                setDeliverySchedule(item.delivered.trim());
              }

              return {
                id: `m-sec6-${idx + 1}`,
                itemNo: itemNoStr,
                description: itemDesc,
                unit: unit || 'Pcs',
                quantity: quantity,
                unitPrice: unitPriceToUse
              };
            });

            setMaterials(mappedMaterials);
            saveToLocalStorage(mappedMaterials);
            return true;
          }
        } catch (e) {
          console.error("Error loading Section VI Schedule of Requirements:", e);
        }
      }
    }

    // SECOND PRIORITY / FALLBACK: Load items from SECTION VII (Technical Specifications)
    for (const key of techSpecsKeys) {
      const savedTechSpecs = localStorage.getItem(key);
      if (savedTechSpecs) {
        try {
          const parsedTech = JSON.parse(savedTechSpecs);
          if (Array.isArray(parsedTech)) {
            const mappedTech: MaterialEstimateRow[] = parsedTech.map((item: any, idx: number) => {
              const qtyStr = item.quantity || '1';
              const qtyMatch = qtyStr.match(/([\d,.]+)\s*(.*)/);
              const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(/,/g, '')) || 1 : 1;
              const unit = qtyMatch && qtyMatch[2] ? qtyMatch[2].trim() : (item.unit || 'Pcs');

              const itemNoStr = item.itemNo || `${idx + 1}`;
              const itemDesc = (item.specification || item.description || '').trim();

              const secPriceNum = item.unitAmount
                ? parseFloat(`${item.unitAmount}`.replace(/[^0-9.]/g, '')) || 0
                : item.unitPrice
                  ? (typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(`${item.unitPrice}`.replace(/[^0-9.]/g, '')) || 0)
                  : item.unitCost
                    ? parseFloat(`${item.unitCost}`.replace(/[^0-9.]/g, '')) || 0
                    : 0;

              const savedPrice = existingPricesMap.get(itemNoStr) ?? existingPricesMap.get(itemDesc);
              const unitPriceToUse = (!forceRefreshPrices && savedPrice !== undefined && savedPrice > 0) ? savedPrice : secPriceNum;

              return {
                id: `m-tech-${idx + 1}`,
                itemNo: itemNoStr,
                description: itemDesc,
                unit: unit || 'Pcs',
                quantity: quantity,
                unitPrice: unitPriceToUse
              };
            });

            setMaterials(mappedTech);
            saveToLocalStorage(mappedTech);
            return true;
          }
        } catch (e) {
          console.error("Error loading Section VII Technical Specs:", e);
        }
      }
    }

    // If no Section VI / VII data exists and no saved detailed estimates exist:
    // START 100% EMPTY FOR THIS PROJECT
    setMaterials([]);
    return false;
  };

  // Load saved detailed estimates data or Section VII/VI data on project switch
  useEffect(() => {
    if (!projectScopeKey) {
      setMaterials([]);
      setLabors([]);
      setLogistics([]);
      setEquipments([]);
      setNoEquipmentNeeded(true);
      return;
    }

    const tenantKey = tenant?.id || 'default';
    const candidateDetKeys = [
      `bidocs_detailed_estimates_${tenantKey}_${projectScopeKey}`,
      projectRefNo ? `bidocs_detailed_estimates_${tenantKey}_${projectRefNo}` : '',
      selectedOppId ? `bidocs_detailed_estimates_${tenantKey}_${selectedOppId}` : ''
    ].filter(Boolean);

    let savedDet: string | null = null;
    for (const key of candidateDetKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        savedDet = val;
        break;
      }
    }

    if (savedDet) {
      try {
        const parsed = JSON.parse(savedDet);
        if (parsed.materials && Array.isArray(parsed.materials)) {
          setMaterials(parsed.materials);
        } else {
          setMaterials([]);
        }
        if (parsed.labors && Array.isArray(parsed.labors)) setLabors(parsed.labors);
        else setLabors([]);
        if (parsed.logistics && Array.isArray(parsed.logistics)) setLogistics(parsed.logistics);
        else setLogistics([]);
        if (parsed.equipments && Array.isArray(parsed.equipments)) {
          setEquipments(parsed.equipments);
          setNoEquipmentNeeded(parsed.equipments.length === 0);
        } else {
          setEquipments([]);
          setNoEquipmentNeeded(true);
        }
        if (parsed.bidSecurityType) setBidSecurityType(parsed.bidSecurityType);
        if (parsed.bidSecurityAmount) setBidSecurityAmount(parsed.bidSecurityAmount);
        if (parsed.deliverySchedule) setDeliverySchedule(parsed.deliverySchedule);
        if (parsed.businessRegType) setBusinessRegType(parsed.businessRegType);
        return;
      } catch (e) {}
    }

    // Reset labors, logistics, equipments for unconfigured projects
    setLabors([]);
    setLogistics([]);
    setEquipments([]);
    setNoEquipmentNeeded(true);

    // Fallback: sync from Section VII / VI if no detailed estimate saved yet
    syncFromSectionVIAndVII(false);
  }, [projectScopeKey, projectRefNo, selectedOppId, tenant?.id]);

  // Save current Detailed Estimates state to localStorage so Financial Bid Form can sync
  const saveToLocalStorage = (
    currentMaterials = materials,
    currentLabors = labors,
    currentLogistics = logistics,
    currentEquipments = equipments
  ) => {
    const scopeKey = projectRefNo || activeProjectRefNo || 'default';
    const storageKey = `bidocs_detailed_estimates_${tenant?.id || 'default'}_${scopeKey}`;

    const matTotal = currentMaterials.reduce((sum, m) => sum + (m.quantity || 0) * (m.unitPrice || 0), 0);
    const labTotal = currentLabors.reduce((sum, l) => sum + (l.noOfWorkers || 0) * (l.noOfDays || 0) * (l.dailyPrice || 0), 0);
    const logTotal = currentLogistics.reduce((sum, lg) => sum + (lg.noOfVehicles || 0) * (lg.noOfDays || 0) * (lg.dailyRate || 0), 0);
    const eqTotal = noEquipmentNeeded ? 0 : currentEquipments.reduce((sum, e) => sum + (e.noOfDays || 0) * (e.dailyPrice || 0), 0);
    const totalEst = matTotal + labTotal + logTotal + eqTotal;

    const payload = {
      projectRefNo,
      solicitationNumber,
      projectName,
      projectLocation,
      ownerName,
      contractorName,
      estimateDate,
      totalMaterialsCost: matTotal,
      totalLaborCost: labTotal,
      totalLogisticsCost: logTotal,
      totalEquipmentCost: eqTotal,
      totalEstimatedProjectCost: totalEst,
      totalBidAmountFigures: totalEst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalBidAmountWords: numberToWords(totalEst),
      materials: currentMaterials,
      labors: currentLabors,
      logistics: currentLogistics,
      equipments: currentEquipments,
      bidSecurityType,
      bidSecurityAmount,
      deliverySchedule,
      businessRegType,
      updatedAt: new Date().toISOString()
    };

    const keysToSave = new Set([
      storageKey,
      projectRefNo ? `bidocs_detailed_estimates_${tenant?.id || 'default'}_${projectRefNo}` : '',
      selectedOppId ? `bidocs_detailed_estimates_${tenant?.id || 'default'}_${selectedOppId}` : ''
    ]);

    try {
      const jsonStr = JSON.stringify(payload);
      keysToSave.forEach(k => {
        if (k) localStorage.setItem(k, jsonStr);
      });
    } catch (e) {
      console.error("Error saving detailed estimates payload:", e);
    }
  };

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const found = oppProjects.find(p => p.id === oppId || p.refNo === oppId);
    if (found) {
      applyFixedProjectHeader(found);
      const targetScopeKey = found.refNo;
      const targetOppId = found.id;
      const tenantKey = tenant?.id || 'default';
      const candidateDetKeys = [
        targetScopeKey ? `bidocs_detailed_estimates_${tenantKey}_${targetScopeKey}` : '',
        targetOppId ? `bidocs_detailed_estimates_${tenantKey}_${targetOppId}` : ''
      ].filter(Boolean);
      
      let savedDet: string | null = null;
      for (const k of candidateDetKeys) {
        const val = localStorage.getItem(k);
        if (val) {
          savedDet = val;
          break;
        }
      }

      if (savedDet) {
        try {
          const parsed = JSON.parse(savedDet);
          if (parsed.materials && Array.isArray(parsed.materials) && parsed.materials.length > 0) {
            setMaterials(parsed.materials);
            if (parsed.labors && Array.isArray(parsed.labors)) setLabors(parsed.labors);
            else setLabors([]);
            if (parsed.logistics && Array.isArray(parsed.logistics)) setLogistics(parsed.logistics);
            else setLogistics([]);
            if (parsed.equipments && Array.isArray(parsed.equipments)) {
              setEquipments(parsed.equipments);
              setNoEquipmentNeeded(parsed.equipments.length === 0);
            } else {
              setEquipments([]);
              setNoEquipmentNeeded(true);
            }
            return;
          }
        } catch (e) {}
      }

      // If no saved detailed estimate with materials exists for this specific project:
      setLabors([]);
      setLogistics([]);
      setEquipments([]);
      setNoEquipmentNeeded(true);

      const synced = syncFromSectionVIAndVII(false, targetScopeKey, targetOppId);
      if (!synced) {
        setMaterials([]);
      }
    }
  };

  // Section VI Target Amount: Strictly derived from the Section VI Service / Installation / Workmanship / Maintenance / Warranty amount (e.g. Row 14)
  const getSectionViTargetAmount = (): number => {
    const tenantKey = tenant?.id || 'default';
    const scopeKey = projectRefNo || activeProjectRefNo || selectedOppId;

    // 1. Check if Section VI has a customServicesAmount in saved services config
    const candidateServiceKeys = [
      scopeKey ? `bidocs_sec_vi_services_${tenantKey}_${scopeKey}` : '',
      selectedOppId ? `bidocs_sec_vi_services_${tenantKey}_${selectedOppId}` : '',
      projectRefNo ? `bidocs_sec_vi_services_${tenantKey}_${projectRefNo}` : ''
    ].filter(Boolean);

    for (const sKey of candidateServiceKeys) {
      const rawSvc = localStorage.getItem(sKey);
      if (rawSvc) {
        try {
          const parsedSvc = JSON.parse(rawSvc);
          if (parsedSvc && parsedSvc.customAmount) {
            const clean = parseFloat(`${parsedSvc.customAmount}`.replace(/[^0-9.]/g, ''));
            if (!isNaN(clean) && clean > 0) return clean;
          }
        } catch (_) {}
      }
    }

    // 2. Check if any item in materials is a Service / Labor / Installation / Warranty / Maintenance / Lot / Lump Sum item
    const isServiceOrLumpSumItem = (m: MaterialEstimateRow): boolean => {
      const desc = (m.description || '').toLowerCase();
      const u = (m.unit || '').toLowerCase();
      return (
        desc.includes('workmanship') ||
        desc.includes('preventive maintenance') ||
        desc.includes('service and technical support') ||
        desc.includes('technical support') ||
        desc.includes('installation') ||
        desc.includes('warranty') ||
        desc.includes('commissioning') ||
        desc.includes('cable pulling') ||
        desc.includes('rough-in') ||
        desc.includes('service agreement') ||
        desc.includes('labor') ||
        desc.includes('services') ||
        desc.includes('lump sum') ||
        (u === 'lot' && (desc.includes('service') || desc.includes('work') || desc.includes('maintenance') || desc.includes('warranty') || desc.includes('install')))
      );
    };

    const serviceItem = materials.find(m => isServiceOrLumpSumItem(m));
    if (serviceItem) {
      const itemTotal = computeMaterialTotal(serviceItem);
      if (itemTotal > 0) return itemTotal;
      if (serviceItem.unitPrice && serviceItem.unitPrice > 0) return serviceItem.unitPrice;
    }

    // 3. Also check the saved raw Section VI items if not found in materials
    const secViKeys = [
      scopeKey ? `bidocs_sec_vi_${tenantKey}_${scopeKey}` : '',
      selectedOppId ? `bidocs_sec_vi_${tenantKey}_${selectedOppId}` : '',
      projectRefNo ? `bidocs_sec_vi_${tenantKey}_${projectRefNo}` : ''
    ].filter(Boolean);

    for (const k of secViKeys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const secItems = JSON.parse(raw);
          if (Array.isArray(secItems) && secItems.length > 0) {
            const matched = secItems.find((it: any) => {
              const desc = (it.description || '').toLowerCase();
              return (
                desc.includes('workmanship') ||
                desc.includes('preventive maintenance') ||
                desc.includes('service') ||
                desc.includes('installation') ||
                desc.includes('warranty') ||
                desc.includes('labor')
              );
            });
            if (matched) {
              const amtStr = matched.total || matched.unitAmount || '';
              const clean = parseFloat(`${amtStr}`.replace(/[^0-9.]/g, ''));
              if (!isNaN(clean) && clean > 0) return clean;
            }
          }
        } catch (_) {}
      }
    }

    // 4. If no explicit service row exists, check the last item of materials if unit is Lot or qty is 1 Lot
    if (materials.length > 0) {
      const lastItem = materials[materials.length - 1];
      const lastUnit = (lastItem.unit || '').toLowerCase();
      if (lastUnit === 'lot' || lastUnit.includes('lot')) {
        const lastTotal = computeMaterialTotal(lastItem);
        if (lastTotal > 0) return lastTotal;
      }
    }

    return 0;
  };

  // Materials Unit Price Update ONLY (Quantity, Description, Unit are 100% fixed to Section VI / VII)
  const handleUpdateMaterialUnitPrice = (id: string, newUnitPrice: number) => {
    const updated = materials.map(m => m.id === id ? { ...m, unitPrice: newUnitPrice } : m);
    setMaterials(updated);
    saveToLocalStorage(updated);
  };

  // Labor Row Manipulations
  const handleAddLabor = () => {
    setActiveTab('LABOR');
    const nextNo = labors.length + 1;
    const updated = [
      ...labors,
      { id: `l-${Date.now()}`, itemNo: `${nextNo}`, description: '', noOfWorkers: 1, unit: 'person', noOfDays: 1, dailyPrice: 0 }
    ];
    setLabors(updated);
    saveToLocalStorage(materials, updated);
  };
  const handleRemoveLabor = (id: string) => {
    const updated = labors.filter(l => l.id !== id);
    setLabors(updated);
    saveToLocalStorage(materials, updated);
  };
  const handleUpdateLabor = (id: string, field: keyof LaborEstimateRow, val: any) => {
    const updated = labors.map(l => l.id === id ? { ...l, [field]: val } : l);
    setLabors(updated);
    saveToLocalStorage(materials, updated);
  };

  // Logistics & Mobilization Row Manipulations
  const handleAddLogistics = () => {
    setActiveTab('LOGISTICS');
    const nextNo = logistics.length + 1;
    const updated = [
      ...logistics,
      { id: `log-${Date.now()}`, itemNo: `${nextNo}`, description: 'Service Vehicles (Light Truck / Utility)', noOfVehicles: 1, unit: 'Vehicle', noOfDays: 1, dailyRate: 0 }
    ];
    setLogistics(updated);
    saveToLocalStorage(materials, labors, updated);
  };
  const handleRemoveLogistics = (id: string) => {
    const updated = logistics.filter(lg => lg.id !== id);
    setLogistics(updated);
    saveToLocalStorage(materials, labors, updated);
  };
  const handleUpdateLogistics = (id: string, field: keyof LogisticsEstimateRow, val: any) => {
    const updated = logistics.map(lg => lg.id === id ? { ...lg, [field]: val } : lg);
    setLogistics(updated);
    saveToLocalStorage(materials, labors, updated);
  };

  // Equipment Row Manipulations
  const handleAddEquipment = () => {
    setActiveTab('EQUIPMENT');
    setNoEquipmentNeeded(false);
    const nextNo = equipments.length + 1;
    const updated = [
      ...equipments,
      { id: `e-${Date.now()}`, itemNo: `${nextNo}`, description: '', unit: 'Unit', noOfDays: 1, dailyPrice: 0 }
    ];
    setEquipments(updated);
    saveToLocalStorage(materials, labors, logistics, updated);
  };
  const handleRemoveEquipment = (id: string) => {
    const updated = equipments.filter(e => e.id !== id);
    setEquipments(updated);
    saveToLocalStorage(materials, labors, logistics, updated);
  };
  const handleUpdateEquipment = (id: string, field: keyof EquipmentEstimateRow, val: any) => {
    const updated = equipments.map(e => e.id === id ? { ...e, [field]: val } : e);
    setEquipments(updated);
    saveToLocalStorage(materials, labors, logistics, updated);
  };

  const handleResetToCleanSlate = () => {
    setMaterials([]);
    setLabors([]);
    setLogistics([]);
    setEquipments([]);
    setNoEquipmentNeeded(true);
    setActiveTab('MATERIALS');
    saveToLocalStorage([], [], [], []);
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
  const totalBidAmountWords = numberToWords(totalEstimatedProjectCost);

  // Auto-default Bid Security Amount when switching to Surety Bond or Cash
  const handleBidSecurityTypeChange = (newType: string) => {
    setBidSecurityType(newType);
    if (newType.includes('SURETY BOND')) {
      if (bidSecurityAmount === 0 && totalEstimatedProjectCost > 0) {
        setBidSecurityAmount(totalEstimatedProjectCost * 0.05); // Default 5% for Surety Bond
      }
    } else if (newType.includes('CASH') || newType.includes('BANK')) {
      if (bidSecurityAmount === 0 && totalEstimatedProjectCost > 0) {
        setBidSecurityAmount(totalEstimatedProjectCost * 0.02); // Default 2% for Cash / Bank Guarantee
      }
    } else {
      setBidSecurityAmount(0); // Bid Securing Declaration has no amount
    }
    saveToLocalStorage();
  };

  // Merchant Business Registration Wording Helper
  const getRegistrationText = () => {
    switch (businessRegType) {
      case 'SEC': return 'S.E.C. Registration';
      case 'DTI': return 'DTI Business Name Registration';
      case 'CDA': return 'CDA Registration Certificate';
      case 'SEC_DTI': default: return 'S.E.C. Registration / DTI License';
    }
  };

  // Dynamic Auto-Fit Pagination Engine: Computes exact line-wrapping geometry per item so pages have NO gaps and NO overlap
  const materialPages = useMemo(() => {
    if (materials.length === 0) return [[]];
    return autoFitPageChunks(
      materials,
      (item) => calculateRowHeight(item.description || '', 65, 13, 8, 22),
      {
        orientation: 'portrait',
        columnCharWidth: 65,
        headerHeightPx: 170,
        footerHeightPx: 520,
        runningFooterPx: 30
      }
    );
  }, [materials]);

  const totalPages = materialPages.length;

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToVault = async () => {
    setIsSaving(true);
    saveToLocalStorage();
    const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Detailed_Estimates.pdf`;
    const containerElem = (document.getElementById('detailed-estimates-pages-container') || document.querySelector('.detailed-estimates-paper')) as HTMLElement;
    if (containerElem) {
      try {
        const dataUrl = await generateThreeLayerPdfDataUrl(null, containerElem, undefined, fileName);
        if (onSaveAndComplete) {
          onSaveAndComplete(dataUrl, `(L) Detailed Estimates - [${projectRefNo}]`, projectRefNo, projectName);
        }
        if (onClose) onClose();
      } catch (e) {
        console.error("Failed to generate Detailed Estimates PDF:", e);
        if (onSaveAndComplete) {
          onSaveAndComplete(undefined, fileName, projectRefNo, projectName);
        }
        if (onClose) onClose();
      }
    }
    setIsSaving(false);
  };

  const handleExportPdf = async () => {
    saveToLocalStorage();
    const fileName = `${projectRefNo || 'PROJECT'}_Financial_Envelope_Detailed_Estimates.pdf`;
    const containerElem = (document.getElementById('detailed-estimates-pages-container') || document.querySelector('.detailed-estimates-paper')) as HTMLElement;
    if (containerElem) {
      try {
        const dataUrl = await generateThreeLayerPdfDataUrl(null, containerElem, undefined, fileName);
        await generateAndDownloadThreeLayerPdf(null, containerElem, undefined, fileName);
        if (onSaveAndComplete) {
          onSaveAndComplete(dataUrl, `(L) Detailed Estimates - [${projectRefNo}]`, projectRefNo, projectName);
        }
      } catch (e) {
        console.error("Failed to export Detailed Estimates PDF:", e);
      }
    }
  };

  const handlePrint = () => {
    saveToLocalStorage();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      {/* LEGAL PORTRAIT 8.5" x 13" PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
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
            width: 8.5in !important;
            min-height: 13in !important;
            page-break-after: always !important;
          }
          .detailed-estimates-paper:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl animate-scaleIn my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header Bar with Prominent Project Selector */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 sticky top-0 z-20 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                <span>(L) Detailed Estimates Form</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  Statutory Form (L)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Section VI Items Synced 100% Identically. Click any price cell on the page to edit directly.
              </p>
            </div>
          </div>

          {/* PROMINENT PROJECT SELECTOR DROPDOWN */}
          <div className="flex items-center gap-2 bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-1.5 shadow-inner">
            <FolderKanban className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase">Bidding Project:</span>
            </div>
            <select
              value={selectedOppId}
              onChange={(e) => handleSelectOpportunity(e.target.value)}
              className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none cursor-pointer border-none max-w-xs sm:max-w-md truncate"
            >
              {oppProjects.length === 0 ? (
                <option value="">[{projectRefNo}] {projectName}</option>
              ) : (
                oppProjects.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    [{p.refNo}] {p.title} ({p.procuringEntity})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToVault}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSaving ? 'Saving...' : 'Save & Attach to Vault'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Legal</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body & Paper Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6">

          {/* DYNAMIC LEGAL PORTRAIT (8.5" x 13") MULTI-PAGE PAPER LAYOUT PREVIEW */}
          <div id="detailed-estimates-pages-container" className="space-y-8 flex flex-col items-center">

            {/* DYNAMIC MATERIAL PAGES (PAGE 1 TO N) */}
            {materialPages.map((pageChunk, pageIdx) => {
              const isFirstPage = pageIdx === 0;
              const isLastMaterialPage = pageIdx === materialPages.length - 1;
              const pageNumber = pageIdx + 1;

              return (
                <div
                  key={`mat-page-${pageIdx}`}
                  className="detailed-estimates-paper single-page-paper w-[8.5in] min-h-[13in] bg-white text-slate-950 p-[0.4in] shadow-2xl font-sans text-[8pt] leading-tight flex flex-col justify-between mx-auto border border-slate-300"
                >
                  <div className="space-y-3">
                    
                    {/* Header: Statutory Header Box on Page 1 ONLY */}
                    {isFirstPage && (
                      <div className="border-2 border-slate-950">
                        <div className="bg-slate-100 p-1.5 text-center font-extrabold text-[8.5pt] border-b-2 border-slate-950">
                          (L) Duly accomplished Detailed Estimates Form, including a summary sheet releasing the unit prices of materials, labor rates, and equipment rentals used in coming up with the bid
                        </div>
                        
                        <div className="grid grid-cols-12 text-[8pt] font-sans">
                          <div className="col-span-8 border-r-2 border-slate-950 p-1.5 space-y-0.5">
                            <p><strong>Project Name:</strong> <span className="uppercase font-bold">{projectName}</span></p>
                            <p><strong>Location (Area of Delivery):</strong> <span className="uppercase">{projectLocation}</span></p>
                            <p><strong>Owner (Procuring Entity):</strong> <span className="uppercase">{ownerName}</span></p>
                            <p><strong>Contractor's Name (Company):</strong> <span className="font-bold uppercase">{contractorName}</span></p>
                            <p><strong>Date (Submission Date):</strong> <span className="font-mono">{estimateDate ? new Date(estimateDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</span></p>
                          </div>
                          <div className="col-span-4 p-1.5 flex flex-col items-center justify-center bg-slate-50 font-mono text-[7.5pt] text-slate-700 space-y-1">
                            <p className="font-bold">PHILGEPS REF NO: {projectRefNo || 'N/A'}</p>
                            {solicitationNumber && solicitationNumber !== 'N/A' && (
                              <p className="font-bold text-[7pt] text-slate-600">SOLICITATION NO: {solicitationNumber}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub Title */}
                    {isFirstPage && (
                      <div className="text-center font-extrabold text-[9pt] uppercase py-0.5 bg-slate-100 border-x-2 border-b-2 border-slate-950">
                        DETAILED ESTIMATES FORM
                      </div>
                    )}

                    {/* MATERIALS ESTIMATE TABLE (Section VI / VII 100% Synced Data) */}
                    <div className="space-y-1">
                      <div className="font-bold text-[8.5pt] uppercase">
                        {isFirstPage ? 'I. MATERIALS ESTIMATES' : `I. MATERIALS ESTIMATES (CONTINUATION - PAGE ${pageNumber})`}
                      </div>
                      <table className="w-full border-collapse border-2 border-slate-950 text-[7.5pt] font-sans">
                        <thead>
                          <tr className="bg-slate-100 border-b-2 border-slate-950 text-center font-bold">
                            <th className="border border-slate-950 p-1 w-10">ITEM NO.</th>
                            <th className="border border-slate-950 p-1 text-left">MATERIALS ESTIMATES / DESCRIPTION</th>
                            <th className="border border-slate-950 p-1 w-14">Unit</th>
                            <th className="border border-slate-950 p-1 w-12">QTY</th>
                            <th className="border border-slate-950 p-1 w-20">Unit Price</th>
                            <th className="border border-slate-950 p-1 w-24">Total Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageChunk.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="border border-slate-950 p-2 text-center font-mono text-slate-500">
                                (No material items listed)
                              </td>
                            </tr>
                          ) : (
                            pageChunk.map((m) => {
                              const rowTotal = computeMaterialTotal(m);
                              return (
                                <tr key={m.id} className="border-b border-slate-950 hover:bg-blue-50/20 transition">
                                  <td className="border border-slate-950 p-1 text-center font-bold font-mono align-middle">{m.itemNo}</td>
                                  <td className="border border-slate-950 p-1 font-normal text-[7.5pt] leading-tight align-middle">{m.description || '-'}</td>
                                  <td className="border border-slate-950 p-1 text-center align-middle font-mono">{m.unit}</td>
                                  <td className="border border-slate-950 p-1 text-center font-mono font-bold align-middle">{m.quantity}</td>
                                  <td className="border border-slate-950 p-0.5 text-right font-mono align-middle bg-emerald-50/20">
                                    <EditableCurrencyCell
                                      value={m.unitPrice}
                                      onChange={(newPrice) => handleUpdateMaterialUnitPrice(m.id, newPrice)}
                                      className="w-20 text-right font-mono font-semibold bg-transparent border-b border-dashed border-emerald-400 hover:border-emerald-600 focus:border-emerald-600 focus:bg-white focus:outline-none p-0 text-[7.5pt] text-slate-900 print:border-none cursor-text"
                                      title="Click to edit unit price"
                                      pesoColor="text-slate-400"
                                    />
                                  </td>
                                  <td className="border border-slate-950 p-1 text-right font-mono font-bold align-middle text-slate-950">
                                    ₱{fmtPeso(rowTotal)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          

                          {isLastMaterialPage && (
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-950">
                              <td colSpan={5} className="border border-slate-950 p-1 text-right font-extrabold uppercase">
                                Total Materials Cost:
                              </td>
                              <td className="border border-slate-950 p-1 text-right font-mono font-extrabold text-[8.5pt] text-slate-950">
                                ₱{fmtPeso(totalMaterialsCost)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {/* EMBEDDED SUMMARY SECTIONS ON LAST PAGE */}
                      {isLastMaterialPage && (
                        <div className="space-y-2 pt-1">
                          
                          {/* SECTION VI LABOR / SERVICES REFERENCE AMOUNT (Screen Only - Excluded on Paper/Print) */}
                          {(() => {
                            const secViTarget = getSectionViTargetAmount();
                            const currentTotal = totalLaborCost + totalLogisticsCost + totalEquipmentCost;
                            const diff = secViTarget - currentTotal;
                            return (
                              <div className="print:hidden no-export bg-amber-50/90 border border-amber-300 rounded p-1.5 flex items-center justify-between text-[7.5pt] font-mono text-amber-950 shadow-sm gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 font-extrabold text-[6.5pt] uppercase border border-amber-300">
                                    Section VI Target
                                  </span>
                                  <strong className="text-slate-950 font-black text-[8.5pt]">
                                    PHP {fmtPeso(secViTarget)}
                                  </strong>
                                </div>

                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white border border-amber-300 shadow-xs">
                                  <span className="text-slate-600 font-bold text-[6.5pt] uppercase">Difference:</span>
                                  <strong className={`font-black text-[8.5pt] ${diff < 0 ? 'text-rose-600' : diff === 0 ? 'text-emerald-700' : 'text-blue-700'}`}>
                                    PHP {fmtPeso(diff)}
                                  </strong>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-600 font-bold text-[7pt]">Current Total (II+III+IV):</span>
                                  <strong className="text-slate-950 font-black text-[8.5pt]">
                                    PHP {fmtPeso(currentTotal)}
                                  </strong>
                                </div>
                              </div>
                            );
                          })()}

                          {/* SECTION II: LABOR RATE / LABOR COST TABLE */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[8pt] uppercase">II. LABOR RATE</span>
                                <button
                                  type="button"
                                  onClick={handleAddLabor}
                                  className="px-1.5 py-0.2 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[6pt] font-bold border border-blue-200 transition flex items-center gap-0.5 cursor-pointer print:hidden no-export"
                                >
                                  <Plus className="w-2 h-2" /> Add Labor Line
                                </button>
                              </div>
                              <span className="text-[6.5pt] font-mono text-slate-500 print:hidden">Directly edit roles, workers, days, and daily rates below</span>
                            </div>
                            <table className="w-full border-collapse border-2 border-slate-950 text-[7pt] font-sans">
                              <thead>
                                <tr className="bg-slate-100 border-b-2 border-slate-950 text-center font-bold">
                                  <th className="border border-slate-950 p-0.5 w-8">ITEM</th>
                                  <th className="border border-slate-950 p-0.5 text-left">DESIGNATED TITLE</th>
                                  <th className="border border-slate-950 p-0.5 w-14">Workers</th>
                                  <th className="border border-slate-950 p-0.5 w-12">Unit</th>
                                  <th className="border border-slate-950 p-0.5 w-12">Days</th>
                                  <th className="border border-slate-950 p-0.5 w-20">Daily Rate</th>
                                  <th className="border border-slate-950 p-0.5 w-24">Total Labor Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {labors.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="border border-slate-950 p-1 text-center font-mono text-slate-500">
                                      (No labor items listed) &mdash;{' '}
                                      <button
                                        type="button"
                                        onClick={handleAddLabor}
                                        className="text-blue-700 font-bold underline cursor-pointer print:hidden no-export"
                                      >
                                        + Add Labor Line
                                      </button>
                                    </td>
                                  </tr>
                                ) : (
                                  labors.map((l, index) => {
                                    const itemNum = materials.length + index + 1;
                                    const rowTotal = computeLaborTotal(l);
                                    return (
                                      <tr key={l.id} className="border-b border-slate-950 hover:bg-blue-50/20 transition group">
                                        <td className="border border-slate-950 p-0.5 text-center font-bold font-mono align-middle relative">
                                          {itemNum}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveLabor(l.id)}
                                            title="Delete row"
                                            className="absolute left-0.5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition print:hidden no-export cursor-pointer"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </td>
                                        <td className="border border-slate-950 p-0.5 font-medium align-middle">
                                          <input
                                            type="text"
                                            value={l.description || ''}
                                            onChange={(e) => handleUpdateLabor(l.id, 'description', e.target.value)}
                                            placeholder="Role / Title"
                                            className="w-full font-sans bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text font-medium"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-center font-mono align-middle">
                                          <input
                                            type="number"
                                            value={l.noOfWorkers || ''}
                                            onChange={(e) => handleUpdateLabor(l.id, 'noOfWorkers', parseInt(e.target.value) || 0)}
                                            className="w-10 text-center font-mono bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-center align-middle">{l.unit}</td>
                                        <td className="border border-slate-950 p-0.5 text-center font-mono align-middle">
                                          <input
                                            type="number"
                                            value={l.noOfDays || ''}
                                            onChange={(e) => handleUpdateLabor(l.id, 'noOfDays', parseInt(e.target.value) || 0)}
                                            className="w-10 text-center font-mono bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-right font-mono align-middle bg-blue-50/20">
                                          <EditableCurrencyCell
                                            value={l.dailyPrice}
                                            onChange={(newRate) => handleUpdateLabor(l.id, 'dailyPrice', newRate)}
                                            className="w-16 text-right font-mono font-semibold bg-transparent border-b border-dashed border-blue-400 hover:border-blue-600 focus:border-blue-600 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text"
                                            title="Click to edit daily rate"
                                            pesoColor="text-slate-400"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-right font-mono font-bold align-middle text-slate-950">
                                          ₱{fmtPeso(rowTotal)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                                <tr className="bg-slate-100 font-bold border-t-2 border-slate-950">
                                  <td colSpan={6} className="border border-slate-950 p-0.5 text-right font-extrabold uppercase">
                                    Total Labor Cost:
                                  </td>
                                  <td className="border border-slate-950 p-0.5 text-right font-mono font-extrabold text-[7.5pt]">
                                    ₱{fmtPeso(totalLaborCost)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* SECTION III: LOGISTICS / MOBILIZATION TABLE */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[8pt] uppercase">III. LOGISTICS / MOBILIZATION</span>
                                <button
                                  type="button"
                                  onClick={handleAddLogistics}
                                  className="px-1.5 py-0.2 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-[6pt] font-bold border border-amber-200 transition flex items-center gap-0.5 cursor-pointer print:hidden no-export"
                                >
                                  <Plus className="w-2 h-2" /> Add Logistics Line
                                </button>
                              </div>
                              <span className="text-[6.5pt] font-mono text-slate-500 print:hidden">Directly edit equipment, days, and daily rates</span>
                            </div>
                            <table className="w-full border-collapse border-2 border-slate-950 text-[7pt] font-sans">
                              <thead>
                                <tr className="bg-slate-100 border-b-2 border-slate-950 text-center font-bold">
                                  <th className="border border-slate-950 p-0.5 w-8">ITEM</th>
                                  <th className="border border-slate-950 p-0.5 text-left">DESIGNATED TITLE</th>
                                  <th className="border border-slate-950 p-0.5 w-18">No. of Units</th>
                                  <th className="border border-slate-950 p-0.5 w-12">Unit</th>
                                  <th className="border border-slate-950 p-0.5 w-12">Days</th>
                                  <th className="border border-slate-950 p-0.5 w-20">Daily Rate</th>
                                  <th className="border border-slate-950 p-0.5 w-24">Total Logistics Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {logistics.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="border border-slate-950 p-1 text-center font-mono text-slate-500">
                                      (No logistics or mobilization items listed) &mdash;{' '}
                                      <button
                                        type="button"
                                        onClick={handleAddLogistics}
                                        className="text-amber-700 font-bold underline cursor-pointer print:hidden no-export"
                                      >
                                        + Add Logistics Line
                                      </button>
                                    </td>
                                  </tr>
                                ) : (
                                  logistics.map((lg, index) => {
                                    const itemNum = materials.length + labors.length + index + 1;
                                    const rowTotal = computeLogisticsTotal(lg);
                                    return (
                                      <tr key={lg.id} className="border-b border-slate-950 hover:bg-amber-50/20 transition group">
                                        <td className="border border-slate-950 p-0.5 text-center font-bold font-mono align-middle relative">
                                          {itemNum}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveLogistics(lg.id)}
                                            title="Delete row"
                                            className="absolute left-0.5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition print:hidden no-export cursor-pointer"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </td>
                                        <td className="border border-slate-950 p-0.5 font-medium align-middle">
                                          <input
                                            type="text"
                                            value={lg.description || ''}
                                            onChange={(e) => handleUpdateLogistics(lg.id, 'description', e.target.value)}
                                            placeholder="Logistics description"
                                            className="w-full font-sans bg-transparent border-b border-dashed border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text font-medium"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-center font-mono align-middle">
                                          <input
                                            type="number"
                                            value={lg.noOfVehicles || ''}
                                            onChange={(e) => handleUpdateLogistics(lg.id, 'noOfVehicles', parseInt(e.target.value) || 0)}
                                            className="w-10 text-center font-mono bg-transparent border-b border-dashed border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-center align-middle">{lg.unit}</td>
                                        <td className="border border-slate-950 p-0.5 text-center font-mono align-middle">
                                          <input
                                            type="number"
                                            value={lg.noOfDays || ''}
                                            onChange={(e) => handleUpdateLogistics(lg.id, 'noOfDays', parseInt(e.target.value) || 0)}
                                            className="w-10 text-center font-mono bg-transparent border-b border-dashed border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-right font-mono align-middle bg-amber-50/20">
                                          <EditableCurrencyCell
                                            value={lg.dailyRate}
                                            onChange={(newRate) => handleUpdateLogistics(lg.id, 'dailyRate', newRate)}
                                            className="w-16 text-right font-mono font-semibold bg-transparent border-b border-dashed border-amber-400 hover:border-amber-600 focus:border-amber-600 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text"
                                            title="Click to edit daily rate"
                                            pesoColor="text-slate-400"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-right font-mono font-bold align-middle text-slate-950">
                                          ₱{fmtPeso(rowTotal)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                                <tr className="bg-slate-100 font-bold border-t-2 border-slate-950">
                                  <td colSpan={6} className="border border-slate-950 p-0.5 text-right font-extrabold uppercase">
                                    Total Logistics / Mobilization:
                                  </td>
                                  <td className="border border-slate-950 p-0.5 text-right font-mono font-extrabold text-[7.5pt]">
                                    ₱{fmtPeso(totalLogisticsCost)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* SECTION IV: EQUIPMENT RENTAL ESTIMATES */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[8pt] uppercase">IV. EQUIPMENT RENTAL ESTIMATES</span>
                                <button
                                  type="button"
                                  onClick={handleAddEquipment}
                                  className="px-1.5 py-0.2 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[6pt] font-bold border border-purple-200 transition flex items-center gap-0.5 cursor-pointer print:hidden no-export"
                                >
                                  <Plus className="w-2 h-2" /> Add Equipment Line
                                </button>
                              </div>
                              <div className="flex items-center gap-2 print:hidden no-export">
                                <button
                                  type="button"
                                  onClick={() => setNoEquipmentNeeded(!noEquipmentNeeded)}
                                  className="text-[6.5pt] font-mono text-purple-700 hover:underline cursor-pointer"
                                >
                                  {noEquipmentNeeded ? 'Switch to: Use Rental Equipment' : 'Switch to: No Equipment Needed'}
                                </button>
                              </div>
                            </div>
                            <table className="w-full border-collapse border-2 border-slate-950 text-[7pt] font-sans">
                              <thead>
                                <tr className="bg-slate-100 border-b-2 border-slate-950 text-center font-bold">
                                  <th className="border border-slate-950 p-0.5 w-8">ITEM</th>
                                  <th className="border border-slate-950 p-0.5 text-left">DESCRIPTION / CAPACITIES</th>
                                  <th className="border border-slate-950 p-0.5 w-18">No. of Units</th>
                                  <th className="border border-slate-950 p-0.5 w-12">Unit</th>
                                  <th className="border border-slate-950 p-0.5 w-12">Days</th>
                                  <th className="border border-slate-950 p-0.5 w-20">Daily Rate</th>
                                  <th className="border border-slate-950 p-0.5 w-24">Total Rental Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {noEquipmentNeeded ? (
                                  <tr>
                                    <td colSpan={7} className="border border-slate-950 p-1 text-center font-bold text-slate-700 uppercase">
                                      NO EQUIPMENT NEEDED NO HEAVY EQUIPMENT RENTALS
                                    </td>
                                  </tr>
                                ) : equipments.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="border border-slate-950 p-1 text-center font-mono text-slate-500">
                                      (No rental equipment listed) &mdash;{' '}
                                      <button
                                        type="button"
                                        onClick={handleAddEquipment}
                                        className="text-purple-700 font-bold underline cursor-pointer print:hidden no-export"
                                      >
                                        + Add Equipment Line
                                      </button>
                                    </td>
                                  </tr>
                                ) : (
                                  equipments.map((e, index) => {
                                    const itemNum = materials.length + labors.length + logistics.length + index + 1;
                                    const rowTotal = computeEquipmentTotal(e);
                                    return (
                                      <tr key={e.id} className="border-b border-slate-950 hover:bg-purple-50/20 transition group">
                                        <td className="border border-slate-950 p-0.5 text-center font-bold font-mono align-middle relative">
                                          {itemNum}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveEquipment(e.id)}
                                            title="Delete row"
                                            className="absolute left-0.5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition print:hidden no-export cursor-pointer"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </td>
                                        <td className="border border-slate-950 p-0.5 font-medium align-middle">
                                          <input
                                            type="text"
                                            value={e.description || ''}
                                            onChange={(ev) => handleUpdateEquipment(e.id, 'description', ev.target.value)}
                                            placeholder="Equipment description"
                                            className="w-full font-sans bg-transparent border-b border-dashed border-slate-300 focus:border-purple-500 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text font-medium"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-center font-mono align-middle">1</td>
                                        <td className="border border-slate-950 p-0.5 text-center align-middle">{e.unit}</td>
                                        <td className="border border-slate-950 p-0.5 text-center font-mono align-middle">
                                          <input
                                            type="number"
                                            value={e.noOfDays || ''}
                                            onChange={(ev) => handleUpdateEquipment(e.id, 'noOfDays', parseInt(ev.target.value) || 0)}
                                            className="w-10 text-center font-mono bg-transparent border-b border-dashed border-slate-300 focus:border-purple-500 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-right font-mono align-middle bg-purple-50/20">
                                          <EditableCurrencyCell
                                            value={e.dailyPrice}
                                            onChange={(newRate) => handleUpdateEquipment(e.id, 'dailyPrice', newRate)}
                                            className="w-16 text-right font-mono font-semibold bg-transparent border-b border-dashed border-purple-400 hover:border-purple-600 focus:border-purple-600 focus:bg-white focus:outline-none p-0 text-[7pt] text-slate-900 print:border-none cursor-text"
                                            title="Click to edit daily rate"
                                            pesoColor="text-slate-400"
                                          />
                                        </td>
                                        <td className="border border-slate-950 p-0.5 text-right font-mono font-bold align-middle text-slate-950">
                                          ₱{fmtPeso(rowTotal)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                                <tr className="bg-slate-100 font-bold border-t-2 border-slate-950">
                                  <td colSpan={6} className="border border-slate-950 p-0.5 text-right font-extrabold uppercase">
                                    Total Equipment Rental Estimates:
                                  </td>
                                  <td className="border border-slate-950 p-0.5 text-right font-mono font-extrabold text-[7.5pt]">
                                    ₱{fmtPeso(totalEquipmentCost)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* SECTION V: A. SUMMARY SHEET BOX */}
                          <div>
                            <div className="border-2 border-slate-950">
                              <div className="bg-slate-100 p-0.5 font-extrabold text-[8pt] uppercase text-center border-b-2 border-slate-950">
                                A. SUMMARY SHEET
                              </div>
                              <table className="w-full border-collapse text-[7.5pt] font-sans">
                                <tbody>
                                  <tr className="border-b border-slate-950">
                                    <td className="p-1 font-bold">Total Materials Cost</td>
                                    <td className="p-1 text-right font-mono font-bold w-44">₱{fmtPeso(totalMaterialsCost)}</td>
                                  </tr>
                                  <tr className="border-b border-slate-950">
                                    <td className="p-1 font-bold">Total Labor Cost</td>
                                    <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(totalLaborCost)}</td>
                                  </tr>
                                  <tr className="border-b border-slate-950">
                                    <td className="p-1 font-bold">Total Logistics and Mobilization</td>
                                    <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(totalLogisticsCost)}</td>
                                  </tr>
                                  <tr className="border-b-2 border-slate-950">
                                    <td className="p-1 font-bold">Total Equipment Rental Cost</td>
                                    <td className="p-1 text-right font-mono font-bold">₱{fmtPeso(totalEquipmentCost)}</td>
                                  </tr>
                                  <tr className="bg-slate-100 font-extrabold text-[8.5pt]">
                                    <td className="p-1.5 uppercase font-black">Total Estimated Project Cost:</td>
                                    <td className="p-1.5 text-right font-mono font-black text-slate-950 text-[9pt]">₱{fmtPeso(totalEstimatedProjectCost)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Declarations Block */}
                          <div className="border-2 border-slate-950 p-2 space-y-1 font-mono text-[7.5pt]">
                            <p>
                              <strong>AMOUNT IN WORDS:</strong>{' '}
                              <span className="font-bold border-b border-slate-950 pb-0.5 uppercase text-[8pt]">
                                {totalBidAmountWords || 'ZERO PESOS ONLY'}
                              </span>
                            </p>
                            <p>
                              <strong>TOTAL BID SECURITY:</strong>{' '}
                              <span className="font-bold uppercase">
                                {bidSecurityType.includes('SECURED') || bidSecurityType.includes('DECLARATION')
                                  ? 'BID SECURING DECLARATION'
                                  : bidSecurityAmount > 0
                                    ? `₱${fmtPeso(bidSecurityAmount)} (${numberToWords(bidSecurityAmount)})`
                                    : '₱0.00'}
                              </span>
                              {(!bidSecurityType.includes('SECURED') && !bidSecurityType.includes('DECLARATION')) && (
                                <span className="print:hidden no-export ml-2 inline-flex items-center gap-1 font-normal text-[6.5pt] text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                                  <span>Exact (₱):</span>
                                  <input
                                    type="number"
                                    value={bidSecurityAmount || ''}
                                    onChange={(e) => {
                                      setBidSecurityAmount(parseFloat(e.target.value) || 0);
                                      saveToLocalStorage();
                                    }}
                                    placeholder="0.00"
                                    className="w-24 text-right font-mono font-bold bg-white border border-purple-300 rounded px-1 text-slate-900 text-[7pt] focus:border-purple-600 focus:outline-none"
                                  />
                                </span>
                              )}
                            </p>
                            <p>
                              <strong>FORM OF BID SECURITY:</strong> <span className="font-bold uppercase">{bidSecurityType}</span>
                            </p>
                            <p className="flex items-center gap-1">
                              <strong>SCHEDULE OF COMPLETE DELIVERY:</strong>{' '}
                              <input
                                type="text"
                                value={deliverySchedule || ''}
                                onChange={(e) => {
                                  setDeliverySchedule(e.target.value);
                                  saveToLocalStorage();
                                }}
                                placeholder="e.g. 30 Calendar Days upon receipt of NTP"
                                className="font-mono font-bold uppercase bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none text-[7.5pt] w-72 text-slate-900 print:border-none p-0 cursor-text"
                              />
                            </p>

                            {/* Bid Security Selection Buttons (Screen Only - Excluded on Paper/Print) */}
                            <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-dashed border-slate-300 print:hidden no-export text-[6.5pt]">
                              <span className="text-slate-500 font-bold uppercase">Security Type:</span>
                              <button
                                type="button"
                                onClick={() => handleBidSecurityTypeChange('BID SECURING DECLARATION')}
                                className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                                  bidSecurityType === 'BID SECURING DECLARATION'
                                    ? 'bg-emerald-700 text-white shadow'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                }`}
                              >
                                Bid Securing Declaration (BSD)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBidSecurityTypeChange('SURETY BOND')}
                                className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                                  bidSecurityType === 'SURETY BOND'
                                    ? 'bg-purple-700 text-white shadow'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                }`}
                              >
                                Surety Bond / Insurance (5%)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBidSecurityTypeChange('CASH OR CASHIER\'S/MANAGER\'S CHECK')}
                                className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                                  bidSecurityType === 'CASH OR CASHIER\'S/MANAGER\'S CHECK'
                                    ? 'bg-blue-700 text-white shadow'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                }`}
                              >
                                Cash / Manager's Check (2%)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBidSecurityTypeChange('BANK DRAFT/GUARANTEE OR IRREVOCABLE LETTER OF CREDIT')}
                                className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                                  bidSecurityType === 'BANK DRAFT/GUARANTEE OR IRREVOCABLE LETTER OF CREDIT'
                                    ? 'bg-indigo-700 text-white shadow'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                }`}
                              >
                                Bank Guarantee (2%)
                              </button>
                            </div>
                          </div>

                          {/* BAC Conforme Statutory Letter */}
                          <div className="space-y-1.5 text-[7.5pt] leading-snug">
                            <div className="space-y-0.5 font-bold uppercase text-[7.5pt]">
                              <p>TO THE B.A.C. Chairman/Chairwoman and B.A.C. Members</p>
                              <p>BIDS AND AWARDS COMMITTEE OF {ownerName} — {projectLocation}</p>
                            </div>

                            <p className="text-justify text-[7.5pt]">
                              I offer the aforesaid, hereby certifying under honor that I am a citizen that I, representing <strong className="uppercase">{contractorName}</strong>, that at least 60% of my capital owned by Filipino citizens; that I am engaged in the business of selling the aforesaid materials with a store/warehouse at <strong className="uppercase">{companyAddress}</strong>; that I am an authorized distributor/merchant with <strong>{getRegistrationText()}</strong>.
                            </p>

                            <p className="text-justify text-[7.5pt]">
                              I further certify that the materials, which I offer in this bid, is ready in my supplier's warehouse and ready for delivery within the time required by the government without extension of time to be wasted.
                            </p>
                          </div>

                          {/* Signatory Conforme Block */}
                          <div className="pt-2 flex items-end justify-between text-[7.5pt]">
                            <div className="space-y-0.5">
                              <p className="font-bold">VERY TRULY YOURS,</p>
                              <p className="font-black text-[8.5pt] uppercase text-slate-950 inline-block pb-0.5 mt-2">
                                {signatoryName || 'MARK-VIN F. OCAMPO'}
                              </p>
                              <p className="font-bold uppercase text-[7pt]">{signatoryTitle || 'AUTHORIZED REPRESENTATIVE'}</p>
                              <p className="font-extrabold uppercase text-[7.5pt]">{contractorName || 'QUANTUM CLOUD CORPORATION'}</p>
                            </div>
                            <div className="text-right font-mono text-[7pt] text-slate-700">
                              <p>Submission Date:</p>
                              <p className="font-bold text-slate-950">{estimateDate ? new Date(estimateDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''} at 11:00 AM</p>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                  </div>

                  {/* Document Footer */}
                  <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[7.5pt] font-mono text-slate-700">
                    <div className="flex items-center gap-3">
                      <DocumentQrCode
                        details={{
                          companyName: contractorName || 'Bidding Entity',
                          documentName: `(L) Detailed Estimates Form - Page ${pageNumber}`,
                          documentNumber: `FIN-DETEST-${projectRefNo || 'INFRA'}`,
                          projectTitle: projectName,
                          projectRefNo: projectRefNo,
                          procuringEntity: ownerName,
                          dateTimeSubmitted: estimateDate || 'March 19, 2026',
                          documentCategory: 'Financial Documents',
                          generatedBy: contractorName || 'Bidding Entity'
                        }}
                        size={36}
                        showCaption={false}
                      />
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-950 uppercase">{contractorName || 'BIDDING ENTITY'}</p>
                        {isLastMaterialPage ? (
                          <p>TOTAL ESTIMATED PROJECT COST: <strong>₱{fmtPeso(totalEstimatedProjectCost)}</strong></p>
                        ) : (
                          <p>PROJECT: <strong>{projectName || 'N/A'}</strong></p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono">Page {pageNumber} of {totalPages}</span>
                      <p className="text-[7pt] text-slate-500">Statutory Form (L) Detailed Estimates</p>
                    </div>
                  </div>

                </div>
              );
            })}
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Legal PDF</span>
            </button>
            <button
              onClick={handleSaveToVault}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileSignature className="w-4 h-4 text-emerald-300" />
              <span>{isSaving ? 'Saving...' : 'Save & Complete Detailed Estimates Form'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export const DetailedEstimatesModal: React.FC<DetailedEstimatesModalProps> = (props) => (
  <VaultErrorBoundary fallbackTitle="Detailed Estimates Form">
    <DetailedEstimatesModalContent {...props} />
  </VaultErrorBoundary>
);

export default DetailedEstimatesModal;
