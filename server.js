import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static assets if dist exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
}

// --------------------------------------------------------------------------
// REST API ENDPOINTS
// --------------------------------------------------------------------------

// 1. Health & Legal Engine Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'BiDOCS - Philippine Public Bidding Management Platform',
    organization: 'Quantum Cloud Corporation',
    regimeEngine: {
      activeRegime: 'DUAL_COMPLIANCE_MODE',
      primaryStatute: 'RA 12009 (New Government Procurement Act - NGPA)',
      irrReference: 'GPPB Resolution No. 02-2025 (Published Feb 10, 2025)',
      legacyStatute: 'RA 9184 (Government Procurement Reform Act - 2016 IRR)',
      transitionPeriodActive: true,
      transitionExpiry: '2027-08-13T00:00:00.000Z'
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// 2. PhilGEPS Public Procurement Opportunities Feed
app.get('/api/opportunities', (req, res) => {
  const opportunities = [
    {
      id: 'opp-ph-001',
      refNo: '12795242',
      solicitationNo: '2025-12-4162-MO',
      title: 'SUPPLY, DELIVERY, INSTALLATION, TESTING, AND CONFIGURATION OF ICT EQUIPMENT, PERIPHERALS, SYSTEMS AND SOFTWARE FOR THE LA TRINIDAD COMMUNICATION, INFORMATION & NETWORK HUB',
      procuringEntity: 'MUNICIPALITY OF LA TRINIDAD',
      region: 'CAR - Cordillera Administrative Region',
      location: 'La Trinidad, Benguet',
      category: 'GOODS',
      subCategory: 'Information and Communications Technology (ICT)',
      abc: 12500000.00,
      abcFormatted: '₱12,500,000.00',
      deadline: '2026-09-30T10:00:00.000Z',
      governingLaw: 'RA 12009',
      stage: 'BIDDING_OPEN',
      coordinates: { lat: 16.4550, lng: 120.5875 }
    },
    {
      id: 'opp-ph-002',
      refNo: '12804910',
      solicitationNo: 'DPWH-NCR-2026-048',
      title: 'CONSTRUCTION OF HYBRID CLOUD DATA CENTER AND DISASTER RECOVERY FACILITY FOR REGIONAL COMMAND AND EMERGENCY OPERATIONS',
      procuringEntity: 'DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS - NCR',
      region: 'NCR - National Capital Region',
      location: 'Port Area, Manila',
      category: 'INFRASTRUCTURE',
      subCategory: 'Specialty Building & High-Tech Facilities',
      pcabRequirement: 'Category AAA (Medium B or higher)',
      abc: 48900000.00,
      abcFormatted: '₱48,900,000.00',
      deadline: '2026-10-15T14:00:00.000Z',
      governingLaw: 'RA 12009',
      stage: 'BIDDING_OPEN',
      coordinates: { lat: 14.5995, lng: 120.9842 }
    },
    {
      id: 'opp-ph-003',
      refNo: '12819034',
      solicitationNo: 'DICT-R7-2026-119',
      title: 'ENTERPRISE ZERO-TRUST NETWORK SECURITY AND DATA SOVEREIGNTY PLATFORM FOR CENTRAL VISAYAS GOVERNMENT ENTITIES',
      procuringEntity: 'DEPARTMENT OF INFORMATION AND COMMUNICATIONS TECHNOLOGY',
      region: 'Region VII - Central Visayas',
      location: 'Cebu City, Cebu',
      category: 'GOODS_SERVICES',
      subCategory: 'Cybersecurity & Cloud Infrastructure',
      abc: 27850000.00,
      abcFormatted: '₱27,850,000.00',
      deadline: '2026-10-22T09:00:00.000Z',
      governingLaw: 'RA 12009',
      stage: 'BIDDING_OPEN',
      coordinates: { lat: 10.3157, lng: 123.8854 }
    },
    {
      id: 'opp-ph-004',
      refNo: '12826190',
      solicitationNo: 'DOH-R11-2026-082',
      title: 'DESIGN, DEPLOYMENT, AND SYSTEM INTEGRATION OF REGIONAL TELEHEALTH TELEMETRY PLATFORM',
      procuringEntity: 'DEPARTMENT OF HEALTH - DAVAO REGIONAL OFFICE',
      region: 'Region XI - Davao Region',
      location: 'Bajada, Davao City',
      category: 'CONSULTING_SERVICES',
      subCategory: 'Systems Architecture & Medical Informatics',
      abc: 18200000.00,
      abcFormatted: '₱18,200,000.00',
      deadline: '2026-11-04T13:00:00.000Z',
      governingLaw: 'RA 12009',
      stage: 'BIDDING_OPEN',
      coordinates: { lat: 7.0736, lng: 125.6110 }
    }
  ];

  res.json({
    total: opportunities.length,
    activeBudgetValue: opportunities.reduce((acc, o) => acc + o.abc, 0),
    data: opportunities,
    timestamp: Date.now()
  });
});

// 3. Document Vault Statutory Compliance Summary
app.get('/api/vault/summary', (req, res) => {
  res.json({
    tenant: 'Quantum Cloud Corporation',
    philgepsPlatinumNo: '202106-237062-883905538',
    status: 'ACTIVE_PLATINUM_VALID',
    documents: [
      { name: "SEC Certificate of Incorporation", status: "VALID", lawRef: "RA 12009 Sec 23.1(a)(i)", expiry: "PERPETUAL" },
      { name: "Mayor's / Business Permit (2026)", status: "VALID", lawRef: "RA 12009 Sec 23.1(a)(ii)", expiry: "2026-12-31" },
      { name: "BIR Tax Clearance Certificate", status: "VALID", lawRef: "Executive Order 398 / RA 12009", expiry: "2027-02-14" },
      { name: "PCAB License (AAA / Large B)", status: "VALID", lawRef: "RA 4566 / RA 12009 Sec 23.1(a)(iv)", expiry: "2027-06-30" },
      { name: "Audited Financial Statements (2025)", status: "VALID", lawRef: "RA 12009 Sec 23.1(a)(v)", expiry: "2027-04-15" },
      { name: "Statement of All Ongoing Gov & Private Contracts", status: "VALID", lawRef: "GPPB Resolution 02-2025", expiry: "REALTIME_UPDATED" },
      { name: "Statement of Single Largest Completed Contract (SLCC)", status: "VALID", lawRef: "RA 12009 Sec 23.1(a)(vii)", expiry: "DOCUMENTED" },
      { name: "Net Financial Contracting Capacity (NFCC) Computation", status: "VALID", lawRef: "RA 12009 Sec 23.1(a)(viii)", expiry: "REALTIME_COMPUTED" }
    ],
    threeLayerPackagingReady: true,
    totalVerified: 8,
    expiringWithin30Days: 0,
    complianceScore: '100.0%'
  });
});

// 4. Dual Regime Statutory Matrix
app.get('/api/regime/status', (req, res) => {
  res.json({
    legacyRegime: {
      name: 'Republic Act No. 9184',
      title: 'Government Procurement Reform Act (GPRA)',
      effectiveDate: '2003-01-26',
      irrYear: '2016 IRR',
      status: 'TRANSITIONAL_PHASE_OUT',
      envelopeStructure: 'Two-Envelope System (Technical & Financial)',
      packagingStandard: 'Original + Copy 1 + Copy 2 enclosed in Mother Envelope'
    },
    currentRegime: {
      name: 'Republic Act No. 12009',
      title: 'New Government Procurement Act (NGPA)',
      effectiveDate: '2024-08-13',
      irrResolution: 'GPPB Resolution No. 02-2025 (Approved Jan 2025, Published Feb 10, 2025)',
      status: 'ACTIVE_STATUTE',
      threeYearTransitionEnds: '2027-08-13',
      enhancements: [
        'Green Public Procurement (GPP) Integration',
        'Electronic Bidding and Open Data Integration via Modernized PhilGEPS (mPhilGEPS)',
        'Most Economically Advantageous Tender (MEAT) evaluation modality',
        'Automated Zero-Whitespace Document Formatting and QR Verification',
        'Enhanced Anti-Corruption Integrity Hash Validation (SHA-256)'
      ]
    }
  });
});

// 5. Bid Package Verification API
app.post('/api/bids/verify', (req, res) => {
  const { projectId, envelope1 = {}, envelope2 = {} } = req.body;
  const missingTech = [];
  const missingFin = [];

  // Required Envelope 1 elements
  if (!envelope1.philgepsPlatinum) missingTech.push("PhilGEPS Platinum Registration Certificate");
  if (!envelope1.bidSecurity) missingTech.push("Bid Securing Declaration / Bid Security");
  if (!envelope1.omnibusSwornStatement) missingTech.push("Omnibus Sworn Statement (10-point GPPB format)");

  // Required Envelope 2 elements
  if (!envelope2.bidForm) missingFin.push("Original Signed Bid Form");
  if (!envelope2.priceSchedule) missingFin.push("Bill of Quantities / Price Schedule");

  const isCompliant = missingTech.length === 0 && missingFin.length === 0;

  res.json({
    timestamp: Date.now(),
    projectId: projectId || 'PROJ-UNKNOWN',
    status: isCompliant ? 'STATUTORILY_COMPLIANT' : 'DISQUALIFIED_MISSING_DOCUMENTS',
    eligibleForOpening: isCompliant,
    envelope1: {
      passed: missingTech.length === 0,
      missing: missingTech
    },
    envelope2: {
      passed: missingFin.length === 0,
      missing: missingFin
    },
    message: isCompliant 
      ? 'All mandatory technical and financial elements satisfy RA 12009 & GPPB standards.'
      : 'Bid envelope packaging incomplete. Submission would fail preliminary examination of bids.'
  });
});

// Security & Hygiene Headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Wildcard SPA route if dist exists (Express 5 compatible)
if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Global API Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }
  console.error('[BiDOCS API ERROR]', err);
  res.status(500).json({ error: 'Internal API Server Error', message: err?.message });
});

// --------------------------------------------------------------------------
// Start Server with Resilient Port Fallback
// --------------------------------------------------------------------------
export function startServer(port = DEFAULT_PORT) {
  const server = app.listen(port, () => {
    console.log(`================================================================`);
    console.log(`  BiDOCS - PHILIPPINE PUBLIC BIDDING PLATFORM (Node.js Express) `);
    console.log(`  Quantum Cloud Corporation - Enterprise Portal                `);
    console.log(`  Local URL:  http://localhost:${port}                          `);
    console.log(`  API Ready:  /api/health, /api/opportunities, /api/vault/summary`);
    console.log(`  Statute:    RA 12009 (NGPA) & RA 9184 Dual-Regime Enabled     `);
    console.log(`================================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[BiDOCS SERVER] Port ${port} is in use. Trying fallback port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[BiDOCS SERVER ERROR]', err);
      process.exit(1);
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return server;
}

// If executed directly via `node server.js`
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server.js')) {
  startServer(Number(DEFAULT_PORT));
}

export default app;
