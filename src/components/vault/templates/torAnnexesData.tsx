import React, { useState } from "react";
import {
  Server,
  ShieldCheck,
  Tv,
  AlertTriangle,
  Scale,
  Wrench,
  Clock,
  Layers,
  Lock,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { TorScopeItem, TorPersonnelItem, TorEquipmentItem, TorSignatory } from "./TOR";

export interface AnnexCItem {
  id: string;
  itemNo: string;
  category: "SOFTWARE" | "CCTV" | "NETWORK" | "DISPLAY_POWER" | "LABOR";
  description: string;
  specifications: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export const ANNEX_C_ITEMS: AnnexCItem[] = [
  // C.2 Software Systems (S-1 to S-5)
  {
    id: "s1",
    itemNo: "S-1",
    category: "SOFTWARE",
    description: "Footage Request Web Application (FootageHub)",
    specifications: "MERN-based web application for controlled CCTV footage requests with workflow, digital requisition, approvals & audit logging",
    quantity: 1,
    unit: "lot",
    unitCost: 150000.0,
    totalCost: 150000.0,
  },
  {
    id: "s2",
    itemNo: "S-2",
    category: "SOFTWARE",
    description: "AI Image Model Analytics System",
    specifications: "Artificial Intelligence system for image-based analytics, visual attribute recognition, and vehicle classification",
    quantity: 1,
    unit: "lot",
    unitCost: 250000.0,
    totalCost: 250000.0,
  },
  {
    id: "s3",
    itemNo: "S-3",
    category: "SOFTWARE",
    description: "AI Video Model Streaming Analytics System",
    specifications: "Artificial Intelligence system for video streaming analytics, crowd density estimation, and multi-camera forensic tracking",
    quantity: 1,
    unit: "lot",
    unitCost: 250000.0,
    totalCost: 250000.0,
  },
  {
    id: "s4",
    itemNo: "S-4",
    category: "SOFTWARE",
    description: "AI Data Analyst Predictive Risk Model",
    specifications: "Artificial Intelligence system for analytical and predictive hazard modeling, sensor correlation & executive decision support",
    quantity: 1,
    unit: "lot",
    unitCost: 300000.0,
    totalCost: 300000.0,
  },
  {
    id: "s5",
    itemNo: "S-5",
    category: "SOFTWARE",
    description: "Integrated Video / Vehicle Management Platform",
    specifications: "Enterprise-grade iVMS-4200 and HikCentral Professional security management backbone with unified audit logs",
    quantity: 1,
    unit: "lot",
    unitCost: 450000.0,
    totalCost: 450000.0,
  },
  {
    id: "s6",
    itemNo: "S-6",
    category: "SOFTWARE",
    description: "Municipal Digital Landing Page & AI Weather Intelligence",
    specifications: "Official public gateway hosting PAGASA, OpenWeather, and Windy API multi-scale weather intelligence with air-gapped network isolation",
    quantity: 1,
    unit: "lot",
    unitCost: 350000.0,
    totalCost: 350000.0,
  },

  // C.4 CCTV and Field Devices (C-1 to C-3)
  {
    id: "c1",
    itemNo: "C-1",
    category: "CCTV",
    description: "4MP AI Bullet Camera (ANPR Capable)",
    specifications: "4MP DarkFighter motorized varifocal lens, automated number plate recognition (ANPR), smart traffic rule compliance, IP67 weatherproof",
    quantity: 16,
    unit: "units",
    unitCost: 42500.0,
    totalCost: 680000.0,
  },
  {
    id: "c2",
    itemNo: "C-2",
    category: "CCTV",
    description: "4MP AI Bullet Camera (General Municipal Surveillance)",
    specifications: "4MP general surveillance, wide dynamic range (WDR), smart IR night vision, vandal-resistant casing, and H.265+ high-efficiency compression",
    quantity: 48,
    unit: "units",
    unitCost: 33550.0,
    totalCost: 1610400.0,
  },
  {
    id: "c3",
    itemNo: "C-3",
    category: "CCTV",
    description: "Camera Mounts, Weatherproof Junctions & Accessories",
    specifications: "Heavy-duty stainless steel pole brackets, weather-sealed utility junction boxes, conduit hardware, and lightning grounding terminations",
    quantity: 1,
    unit: "lot",
    unitCost: 168925.35,
    totalCost: 168925.35,
  },

  // C.5 Network Extension & Connectivity (N-1 to N-9)
  {
    id: "n1",
    itemNo: "N-1",
    category: "NETWORK",
    description: "4-Port Industrial Gigabit PoE Switch",
    specifications: "Industrial wide-temperature Gigabit 802.3af/at PoE switch with 6kV surge protection for outdoor pole distribution cabinets",
    quantity: 28,
    unit: "units",
    unitCost: 4560.0,
    totalCost: 127680.0,
  },
  {
    id: "n2",
    itemNo: "N-2",
    category: "NETWORK",
    description: "8-Port Industrial Gigabit PoE Switch",
    specifications: "Industrial managed Layer-2/3 Gigabit PoE switch with dual SFP optical uplink ports and VLAN segmentation capability",
    quantity: 10,
    unit: "units",
    unitCost: 6560.0,
    totalCost: 65600.0,
  },
  {
    id: "n3",
    itemNo: "N-3",
    category: "NETWORK",
    description: "Fiber-to-Ethernet Industrial Media Converter",
    specifications: "Single-mode optical transceiver converter with 1310/1550nm wavelength multiplexing and diagnostic LED indicators",
    quantity: 35,
    unit: "units",
    unitCost: 4250.0,
    totalCost: 148750.0,
  },
  {
    id: "n4",
    itemNo: "N-4",
    category: "NETWORK",
    description: "Outdoor Wireless Point-to-Point Bridge (5GHz)",
    specifications: "5GHz 23dBi high-gain directional wireless bridge for remote non-line-of-sight elevation links and redundant backhaul",
    quantity: 8,
    unit: "units",
    unitCost: 9550.0,
    totalCost: 76400.0,
  },
  {
    id: "n5",
    itemNo: "N-5",
    category: "NETWORK",
    description: "Enterprise CPE VPN Gateway Router",
    specifications: "Multi-WAN gigabit router with hardware IPSec/WireGuard VPN tunneling, stateful firewall, and QoS traffic shaping",
    quantity: 1,
    unit: "unit",
    unitCost: 35540.0,
    totalCost: 35540.0,
  },
  {
    id: "n6",
    itemNo: "N-6",
    category: "NETWORK",
    description: "Single-Core Armored Outdoor Fiber Drop Cable",
    specifications: "G.652.D armored single-core outdoor aerial/conduit drop optical fiber cable (1,000m per reel, steel wire messenger)",
    quantity: 20,
    unit: "reels",
    unitCost: 10500.0,
    totalCost: 210000.0,
  },
  {
    id: "n7",
    itemNo: "N-7",
    category: "NETWORK",
    description: "Outdoor Shielded UV-Resistant CAT6 Cable",
    specifications: "Weatherproof UV-rated double-jacket solid copper STP Cat6 cable with drain wire (305m per roll)",
    quantity: 25,
    unit: "rolls",
    unitCost: 9850.0,
    totalCost: 246250.0,
  },
  {
    id: "n8",
    itemNo: "N-8",
    category: "NETWORK",
    description: "Anti-Static Fiber Distribution Utility Enclosures",
    specifications: "Outdoor IP66 anti-static lockable fiber termination and distribution enclosures with internal splice cassettes",
    quantity: 28,
    unit: "units",
    unitCost: 11100.0,
    totalCost: 310800.0,
  },
  {
    id: "n9",
    itemNo: "N-9",
    category: "NETWORK",
    description: "Precision Fiber Splicing & OTDR Testing Tool Kits",
    specifications: "Optical power meters, visual fault locators, precision diamond cleavers, and testing consumables for field technicians",
    quantity: 3,
    unit: "kits",
    unitCost: 25800.0,
    totalCost: 77400.0,
  },

  // C.6 Display, Power and Utilities (D-1 to D-3)
  {
    id: "d1",
    itemNo: "D-1",
    category: "DISPLAY_POWER",
    description: "Command Center Commercial Video Wall System",
    specifications: "55-inch ultra-narrow bezel commercial LCD displays (24/7 continuous operation rated) with multi-screen matrix controller and wall mounts",
    quantity: 1,
    unit: "lot",
    unitCost: 831000.0,
    totalCost: 831000.0,
  },
  {
    id: "d2",
    itemNo: "D-2",
    category: "DISPLAY_POWER",
    description: "Online Double-Conversion UPS / AVR System",
    specifications: "1,000VA - 3,000VA online rack-mount UPS with automatic voltage regulation, surge suppression, and battery expansion modules",
    quantity: 4,
    unit: "units",
    unitCost: 125000.0,
    totalCost: 500000.0,
  },
  {
    id: "d3",
    itemNo: "D-3",
    category: "DISPLAY_POWER",
    description: "Server Room & Network Hub Remodeling Infrastructure",
    specifications: "Dedicated server room raised floor, anti-static work benches, cable trays, precision cooling, fire suppression, and biometric access control",
    quantity: 1,
    unit: "lot",
    unitCost: 250000.0,
    totalCost: 250000.0,
  },

  // C.8 Labor, Engineering & Commissioning (L-1)
  {
    id: "l1",
    itemNo: "L-1",
    category: "LABOR",
    description: "Systems Engineering, Fiber Splicing, AI Setup & Commissioning Labor",
    specifications: "Comprehensive labor covering optical fusion splicing, OTDR certifying across 46 nodes, network routing, AI pipeline deployment, 24/7 testing, SOP drafting, and LGU operator training",
    quantity: 1,
    unit: "lot",
    unitCost: 3228102.65,
    totalCost: 3228102.65,
  },
];

export const TOTAL_MATERIALS_COST = 10771897.35;
export const TOTAL_LABOR_COST = 3228102.65;
export const GRAND_TOTAL_ABC = 14000000.0;

export const LTCISCC_SCOPE_ITEMS: TorScopeItem[] = ANNEX_C_ITEMS.map((item) => ({
  id: `lt-${item.id}`,
  itemNo: item.itemNo,
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  specificationDetails: item.specifications,
  timelineMilestone:
    item.category === "SOFTWARE"
      ? "Phase 1 - Phase 4 (Day 30 - 150)"
      : item.category === "CCTV"
        ? "Phase 3 (Day 90 - 140)"
        : item.category === "NETWORK"
          ? "Phase 2 - Phase 3 (Day 60 - 130)"
          : item.category === "DISPLAY_POWER"
            ? "Phase 2 - Phase 4 (Day 60 - 150)"
            : "Phase 1 - Phase 5 (Day 1 - 180)",
}));

export const LTCISCC_KEY_PERSONNEL: TorPersonnelItem[] = [
  {
    id: "lt-kp1",
    position: "Project Director / Systems Architect",
    qualification:
      "Professional Electronics Engineer (PECE) or Licensed Computer Engineer with minimum 5 years experience in enterprise command center deployments",
    count: 1,
  },
  {
    id: "lt-kp2",
    position: "Lead Fiber Optic & Network Infrastructure Engineer",
    qualification:
      "Certified Fiber Optic Technician (CFOT) with proven track record in municipal optical backbone installations and OTDR certification",
    count: 1,
  },
  {
    id: "lt-kp3",
    position: "Senior AI & Full-Stack Systems Engineer",
    qualification:
      "Senior software engineer with expertise in MERN stack, WebRTC/RTSP video streaming, and containerized AI model inference pipelines",
    count: 1,
  },
  {
    id: "lt-kp4",
    position: "CCTV & Physical Security Platform Specialist",
    qualification:
      "Factory-certified engineer in HikCentral Professional and enterprise VMS platforms with minimum 3 years field experience",
    count: 1,
  },
  {
    id: "lt-kp5",
    position: "Safety & Health Officer",
    qualification:
      "DOLE-Accredited Safety Officer (SO2 or SO3) with valid 40-hour Construction Occupational Safety and Health (COSH) certification",
    count: 1,
  },
];

export const LTCISCC_EQUIPMENT_REQUIREMENTS: TorEquipmentItem[] = [
  {
    id: "lt-eq1",
    description: "Precision Optical Fiber Fusion Splicer (Active Core Alignment)",
    capacity: "Core-to-core alignment, <= 0.02 dB splice loss",
    units: 2,
  },
  {
    id: "lt-eq2",
    description: "Optical Time-Domain Reflectometer (OTDR) with Launch Cable",
    capacity: "1310/1550nm dual wavelength, dynamic range >= 32 dB",
    units: 2,
  },
  {
    id: "lt-eq3",
    description: "Hydraulic Aerial Boom / Bucket Truck for Pole Line Deployments",
    capacity: "Working height >= 14 meters, insulated boom",
    units: 1,
  },
  {
    id: "lt-eq4",
    description: "Industrial Cable Analyzer & TDR Fluke Network Tester",
    capacity: "Category 6 / 6A certification up to 500 MHz",
    units: 2,
  },
  {
    id: "lt-eq5",
    description: "Earth Ground Loop Impedance & Resistance Clamp Tester",
    capacity: "0.01 to 1000 ohms earth resistance measurement",
    units: 1,
  },
  {
    id: "lt-eq6",
    description: "Mobile Fiber Splicing Workstation & Field Utility Trailer",
    capacity: "Climate-controlled dust-free on-site splicing booth",
    units: 2,
  },
];

export const LTCISCC_SIGNATORIES: TorSignatory[] = [
  {
    role: "PREPARED_BY",
    label: "Prepared / Formulated By:",
    name: "Engr. Kevin C. Soriano",
    title: "Municipal Project Engineer / Technical Estimator",
    officeOrLicense: "PRC Reg. No. 0138941 | Municipal Engineering Office",
  },
  {
    role: "CHECKED_BY",
    label: "Checked / Reviewed By:",
    name: "Engr. Benedict P. Pineda",
    title: "Head, Municipal Disaster Risk Reduction & Management Office",
    officeOrLicense: "MDRRMO, Municipality of La Trinidad",
  },
  {
    role: "RECOMMENDING",
    label: "Recommending Approval:",
    name: "Atty. Victor B. Kiat-ong",
    title: "Municipal Legal Officer / BAC Chairperson",
    officeOrLicense: "Bids and Awards Committee, La Trinidad",
  },
  {
    role: "APPROVED_BY",
    label: "Approved By (Head of Procuring Entity - HOPE):",
    name: "Hon. Romeo K. Salda",
    title: "Municipal Mayor",
    officeOrLicense: "Office of the Municipal Mayor, La Trinidad, Benguet",
  },
];

// Reusable Interactive Annexes Workbench UI
export const TorAnnexesWorkbench: React.FC<{
  activeTab: "annex-c" | "annex-ae" | "annex-bg" | "annex-di";
  onTabChange: (tab: "annex-c" | "annex-ae" | "annex-bg" | "annex-di") => void;
}> = ({ activeTab, onTabChange }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const filteredItems = ANNEX_C_ITEMS.filter((item) => {
    const matchesCategory =
      selectedCategory === "ALL" || item.category === selectedCategory;
    const matchesSearch =
      item.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.itemNo.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.specifications.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categorySubtotal = filteredItems.reduce(
    (sum, it) => sum + it.totalCost,
    0,
  );

  const fmtPeso = (val: number) =>
    val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-6">
      {/* ANNEXES HEADER TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => onTabChange("annex-c")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "annex-c"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Annex C: Program of Work & BOQ (₱14,000,000.00)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("annex-ae")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "annex-ae"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Annex A & E: Core Compute & Software Architecture</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("annex-bg")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "annex-bg"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Annex B & G: SOPs & 3-Hour SLA</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("annex-di")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "annex-di"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Annex D & I: Data Privacy (RA 10173) & TWG Findings</span>
        </button>
      </div>

      {/* VIEW 1: ANNEX C — BILL OF QUANTITIES & COST BREAKDOWN */}
      {activeTab === "annex-c" && (
        <div className="space-y-4">
          {/* STATUTORY COST SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Total Materials & Equipment
              </span>
              <p className="text-lg font-black text-blue-400 font-mono">
                ₱{fmtPeso(TOTAL_MATERIALS_COST)}
              </p>
              <p className="text-[10px] text-slate-500">
                Software S1-S6, CCTV C1-C3, Network N1-N9, Displays D1-D3
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Configuration & Programming Labor
              </span>
              <p className="text-lg font-black text-purple-400 font-mono">
                ₱{fmtPeso(TOTAL_LABOR_COST)}
              </p>
              <p className="text-[10px] text-slate-500">
                Item L-1: Splicing, OTDR certifying, AI setup, testing & training
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                Grand Total Project Cost (ABC)
              </span>
              <p className="text-xl font-black text-emerald-300 font-mono">
                ₱{fmtPeso(GRAND_TOTAL_ABC)}
              </p>
              <p className="text-[10px] text-emerald-400/80 font-medium">
                Fourteen Million Pesos (100% compliant under Ord. 28-2017)
              </p>
            </div>
          </div>

          {/* CATEGORY FILTER PILLS & SEARCH */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "ALL", label: "All Items (22)" },
                { id: "SOFTWARE", label: "Software & AI (6)" },
                { id: "CCTV", label: "CCTV & Field (3)" },
                { id: "NETWORK", label: "Network Extension (9)" },
                { id: "DISPLAY_POWER", label: "Displays & Power (3)" },
                { id: "LABOR", label: "Labor & Commissioning (1)" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search Annex C items..."
                className="px-3 py-1 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
              />
              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                Subtotal: <strong>₱{fmtPeso(categorySubtotal)}</strong>
              </span>
            </div>
          </div>

          {/* DETAILED BOQ TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3 w-16 text-center">Item</th>
                  <th className="py-2.5 px-3 w-28">Category</th>
                  <th className="py-2.5 px-4">Item Description</th>
                  <th className="py-2.5 px-4">Technical Specifications</th>
                  <th className="py-2.5 px-3 text-right w-16">Qty</th>
                  <th className="py-2.5 px-3 text-center w-16">Unit</th>
                  <th className="py-2.5 px-3 text-right w-28">Unit Cost (₱)</th>
                  <th className="py-2.5 px-3 text-right w-32">Total Cost (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredItems.map((it) => (
                  <tr
                    key={it.id}
                    className="hover:bg-slate-900/40 transition text-slate-200"
                  >
                    <td className="py-2 px-3 text-center font-mono font-bold text-amber-400">
                      {it.itemNo}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {it.category}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-semibold text-white">
                      {it.description}
                    </td>
                    <td className="py-2 px-4 text-slate-400 text-[11px] leading-relaxed max-w-md">
                      {it.specifications}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium">
                      {it.quantity}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {it.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {fmtPeso(it.unitCost)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      ₱{fmtPeso(it.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-800 bg-slate-900/95 font-mono text-xs text-white">
                  <td colSpan={4} className="py-3 px-4 font-bold uppercase tracking-wider text-right">
                    Active Filter Subtotal:
                  </td>
                  <td colSpan={4} className="py-3 px-3 text-right text-emerald-400 font-black text-sm">
                    ₱{fmtPeso(categorySubtotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: ANNEX A & E — CORE COMPUTE & SOFTWARE ARCHITECTURE */}
      {activeTab === "annex-ae" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ANNEX A.1 COMPUTE SERVERS */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Annex A.1: Command Center AI Compute Servers
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Dual Enterprise Servers for Model Inference &amp; Storage
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Processors:</strong> Dual Intel Xeon 40-core / 80-thread high-throughput processors per node.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>AI Acceleration:</strong> 16GB GDDR6 ECC enterprise GPU optimized for real-time inference.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Storage &amp; Power:</strong> 8 × 4TB hot-swap SAS/SATA bays in RAID-6 with dual 1100W redundant PSUs.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Networking:</strong> 4 × 1GbE copper + 2 × 10GbE SFP+ optical uplinks to the Command Center core.
                  </span>
                </div>
              </div>
            </div>

            {/* ANNEX A.2 VIDEO WALL & WORKSTATIONS */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Annex A.2: Video Wall &amp; Console Controllers
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    55-inch Ultra-Narrow Commercial Displays with Matrix Switcher
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bezel Width:</strong> Ultra-narrow bezel (≤ 1.8mm combined) with 500 nits anti-glare continuous rating.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Matrix Controller:</strong> Hardware video wall processor supporting 4K HDMI/DVI inputs, window roaming, PIP.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Power Protection:</strong> Dedicated 3,000VA Online Double-Conversion UPS with zero transfer time.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Workstations:</strong> Ergonomic multi-monitor dispatch consoles with silent mini-PC operator terminals.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ANNEX E ENTERPRISE SOFTWARE PLATFORMS */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Annex E: 4 Mandatory Integrated Software Ecosystem Layers</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                  Layer 1: Core VMS
                </span>
                <p className="font-bold text-white">iVMS-4200 Video Management</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Desktop-based primary surveillance platform handling live camera views, PTZ tours, multi-channel synchronous playback, and incident bookmarking.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">
                  Layer 2: Enterprise Security
                </span>
                <p className="font-bold text-white">HikCentral Professional</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Enterprise-grade centralized security management backbone for multi-system orchestration, access control, automated audit logging, and alarm dispatch.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                  Layer 3: AI Risk Intelligence
                </span>
                <p className="font-bold text-white">Integrated Weather Platform</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Real-time, forecast, and AI-assisted weather analysis aggregating PAGASA radar, OpenWeather, and Windy global atmospheric models for disaster risk reduction.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                  Layer 4: Evidence Hub
                </span>
                <p className="font-bold text-white">FootageHub Portal</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  MERN-based web portal enabling controlled footage requests, AI video and image analysis, forensic search, and tamper-evident SHA-256 evidence chain of custody.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ANNEX B & G — OPERATIONAL SOPS & 3-HOUR SLA */}
      {activeTab === "annex-bg" && (
        <div className="space-y-6">
          {/* OPERATING MODES */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Annex B.1: Three Standard Operating Modes</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">1. Normal Operations</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px]">24/7 Baseline</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Routine monitoring of 46 field nodes, continuous traffic logging, routine weather verification, and standard municipal coordination.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">2. Heightened Alert</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px]">Pre-Disaster</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Triggered by PAGASA storm signals or public safety alerts. Doubles operator shifts, pre-checks fiber ring health, and pre-positions emergency dispatch.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400">3. Emergency Operations</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[9px]">Full Crisis</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Full Command Center activation directly under the MDRRMO Head and Municipal Mayor. Video wall dedicated to incident routing and live evacuation tracking.
                </p>
              </div>
            </div>
          </div>

          {/* 3-HOUR SLA WARRANTY */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>Annex G: Three (3)-Year Comprehensive Warranty &amp; Mandatory 3-Hour SLA</span>
            </h4>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Mandatory Three (3)-Hour Emergency Response SLA</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                    Considering that the surveillance system is a life-safety component of the Emergency Operations Center (EOC), any failure of critical cameras, fiber links, or core servers requires an authorized technical specialist on-site within Three (3) Hours of notification.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">3-Year All-Inclusive Parts &amp; Workmanship Guarantee</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                    Full replacement warranty on all newly installed 4MP DarkFighter cameras, core switches, media converters, video wall displays, and seamless maintenance of integrated existing cameras without additional cost to the Municipality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: ANNEX D & I — DATA PRIVACY & TWG ADJUDICATIVE FINDINGS */}
      {activeTab === "annex-di" && (
        <div className="space-y-6">
          {/* ANNEX D DATA PRIVACY */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>Annex D: Data Privacy Act (RA 10173) &amp; CCTV Chain of Custody</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <p className="font-bold text-white">Role-Based Access Control (RBAC)</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Strict segregation of Operator, Supervisor, Administrator, and Executive privileges. No single operator can export footage without supervisor approval.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <p className="font-bold text-white">30-Day Automated Retention</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Automated FIFO overwrite cycle of 30 calendar days for routine surveillance footage. Flagged incident recordings are isolated in an encrypted evidence vault.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <p className="font-bold text-white">Cryptographic Hashing (SHA-256)</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Every video clip exported for court proceedings or PNP investigation is tagged with an immutable SHA-256 hash and dynamic digital watermark to ensure legal chain of custody.
                </p>
              </div>
            </div>
          </div>

          {/* ANNEX I TWG ADJUDICATIVE FINDINGS */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-rose-400" />
              <span>Annex I: Technical Working Group (TWG) Adjudicative Directives</span>
            </h4>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                  Directive 1: Minimum Viable Infrastructure Clause
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Under Section VII.C, bidders are prohibited from offering purely cloud-hosted or software-only solutions without physical on-premise compute servers, local NVR redundancy, and direct optical termination within the LTCISCC building.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                  Directive 2: Processing-Locus Architecture Disambiguation
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Clarified that heavy video analytics and vehicle license plate recognition (ANPR) must execute at the edge on the 4MP DarkFighter cameras, while batch forensic correlation and multi-camera re-identification occur centrally on the LTCISCC AI compute servers.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                  Directive 3: Asynchronous Message Queue Segregation
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The Municipal Digital Landing Page must communicate with internal Command Center databases exclusively via asynchronous message queues (AMQP/RabbitMQ) and read-only replicas to guarantee zero external ingress into the live CCTV streaming network.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
