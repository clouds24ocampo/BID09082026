# BIDOCS

## Project Description
Project Name (placeholder)

{{COMPANY_NAME}} Public Bidding Management System
Replace {{COMPANY_NAME}}, {{LOGO_PATH}}, {{BRAND_COLOR}} across the project when white-labeling for another business. See README.md for the full white-label swap list.

One-sentence outcome

Build a reusable, white-labelable internal platform that helps a Philippine business prepare, track, and manage compliant government bid submissions under RA 9184 / RA 12009 (NGPA), across PhilGEPS opportunities for Goods, Infrastructure, and Consulting Services — usable across multiple companies you own by only swapping name/logo/branding.

Who this is for
Primary user: you (the business owner) and your bid/proposal team.
Secondary users: per-company admins if you deploy one instance per business, or a single multi-tenant instance serving all your companies.
What they need to do afterward: log in, see open PhilGEPS opportunities relevant to their line of business, know instantly which eligibility documents are missing/expiring, assemble a compliant bid package, and track status (submitted → opened → post-qualification → awarded/lost).
Hard constraints
Must reflect current Philippine law: RA 9184 (2003, Government Procurement Reform Act) as revised/replaced by RA 12009 (New Government Procurement Act, signed 20 Jul 2024, effective 13 Aug 2024, IRR approved via GPPB Resolution No. 02-2025, published 10 Feb 2025). A 3-year transition period applies — some agencies may still reference RA 9184's 2016 IRR until fully migrated. The system must track which regime governs a given bid (transition logic), not assume one law forever.
Must be built/edited in VS Code.
Must run on a fast, memory-safe/secure stack (see 02-tech-stack/).
Must be reusable across multiple companies: no hardcoded company name, logo, TIN, PCAB license no., SEC/DTI registration no., signatory names, etc. — all of that is tenant configuration, not code.

Must be able to record fine-grained details: every document, its version, expiry date, source law/section, and per-bid checklist state.

Legal content in this repo is reference material, not legal advice — a lawyer/licensed broker should validate before actual submission of a real bid.

Success criteria (checked at Phase 5 — Validate)
A written, sourced summary exists of RA 9184, RA 12009, and their IRRs, GPPB, and PhilGEPS's role — with citations to primary sources.
Three separate, accurate eligibility/document checklists exist: Goods, Infrastructure, Consulting Services.
A directory of official downloadable forms (PhilGEPS + GPPB) exists with direct links, organized by procurement type and by bidding stage (eligibility, technical, financial).
A tech stack decision is made and justified (speed + security + maintainability, not just benchmarks).
A master plan / enterprise proposal document exists that a non-technical business partner could read and approve.
A folder/file structure exists that lets a second company be onboarded by editing one config file, not touching code.
Everything is saved as version-controlled .md/code files that survive without this conversation (Phase 7 — Preserve).
Explicitly out of scope (for now)
Actually submitting a live bid on your behalf.
Guaranteeing PCAB licensing, SEC registration, or tax matters — those need a lawyer/accountant.
A finished, production-deployed application in this session — this session delivers Goal → Think → Design plus a research base; Build happens in a following session once you approve the design.
## Product Requirements Document
# BIDOCS Product Requirements Document (PRD)
## {{COMPANY_NAME}} Public Bidding Management System
---
## 1. Document Overview & Executive Summary

### 1.1 Purpose
This Product Requirements Document (PRD) defines the comprehensive product scope, functional capabilities, technical architecture, and execution roadmap for **BIDOCS** ({{COMPANY_NAME}} Public Bidding Management System). BIDOCS is a reusable, white-labelable internal platform engineered to streamline, track, and manage government bid submissions under Philippine procurement laws (RA 9184 and the New Government Procurement Act RA 12009). 

### 1.2 Target Audience & User Personas
*   **Company Owner:** Needs high-level financial and compliance visibility, approval gates for bid submissions, win/loss analytics, and zero legal exposure due to expired or missing corporate documents.
*   **Bid Manager / Proposal Team:** Needs end-to-end operational workflows: capturing PhilGEPS opportunities, running automated eligibility checks (Goods, Infrastructure, Consulting Services), assembling technical/financial envelopes, generating compliant GPPB forms, and tracking post-qualification milestones.

### 1.3 Key Value Proposition
*   **Zero Hardcoding White-Labeling:** Deployable across multiple owned companies simply by swapping configuration variables (`{{COMPANY_NAME}}`, `{{LOGO_PATH}}`, `{{BRAND_COLOR}}`, PCAB licenses, SEC/DTI details).
*   **Dual-Legal-Regime Compliance:** Intelligent tracking supporting legacy RA 9184 (2016 IRR) and the transitional/current RA 12009 (NGPA, GPPB Res. 02-2025).
*   **Comprehensive Lifecycle Coverage:** From opportunity discovery to award notification and contract implementation tracking.

---

## 2. Product Goals & Success Criteria

### 2.1 10-Day Delivery Timeline
The project is structured for rapid execution and deployment on a local development environment within a strict 10-day sprint cycle, divided into phases:
*   **Days 1–2:** Legal Framework & Compliance Architecture (RA 9184 vs. RA 12009 checklists).
*   **Days 3–4:** Core Data Model, Document Vault, and Tenant Configuration System.
*   **Days 5–6:** PhilGEPS Opportunity Scraper/Sync & Bid Package Builder Workflows.
*   **Days 7–8:** Advanced Analytics, Notifications, and Export Engine (GPPB/PhilGEPS forms).
*   **Days 9–10:** Local Security Hardening, White-Label Swap Testing, and Final Documentation.

### 2.2 Success Metrics
*   100% of required eligibility documents mapped per procurement type (Goods, Infrastructure, Consulting).
*   Sub-second search and retrieval across the secure local document vault.
*   Zero code modifications required to spin up an instance for a secondary company profile.
*   Full synchronization of opportunities, deadline countdowns, and status transitions.
---
## 3. Scope & Feature Specifications
### 3.1 Core Module 1: White-Label Tenant Engine
*   **Configuration Architecture:** A single centralized configuration file (`tenant.config.json` / environment variables) governing brand identity.
*   **Properties Managed:**
    *   `COMPANY_NAME`: Legal business name.
    *   `LOGO_PATH`: Asset pointer for UI and generated PDF headers.
    *   `BRAND_COLOR`: Primary theme injection.
    *   `REGISTRATION_DETAILS`: SEC / DTI registration numbers, TIN, PhilGEPS Platinum Membership number.
    *   `LICENSING`: PCAB License Number, Category, and Special Classifications (for Infrastructure bids).
    *   `SIGNATORIES`: Authorized Managing Officer (AMO) and designated attorney-in-fact details.

### 3.2 Core Module 2: Legal Regime Transition Engine (RA 9184 & RA 12009)
*   **Regime Tagging:** Every imported or manual project must be tagged with its governing legal framework:
    *   `RA_9184_LEGACY`: Standard 2003 Act with 2016 IRR.
    *   `RA_12009_NGPA`: New Government Procurement Act (Effective Aug 2024 / IRR GPPB Res. 02-2025).
    *   `TRANSITIONAL`: Projects operating under transition guidelines.
*   **Dynamic Rule Engine:** Automatically adjust required checklists, submission deadlines, protest mechanisms, and evaluation criteria based on the selected legal regime tag.

### 3.3 Core Module 3: Document Vault & Compliance Engine
*   **Secure Storage:** Local encrypted file storage system with role-based access control and integrity hashing (SHA-256).
*   **Metadata Tagging:** Version control, issuance date, validity/expiry date, issuing authority, and source law reference.
*   **Automated Expiry Alerts:** Real-time tracking of time-sensitive documents (e.g., Tax Clearance, Mayor's/Business Permit, PCAB License, Audited Financial Statements, PhilGEPS Platinum Certificate). Dashboard color codes: Green (Valid), Yellow (<30 days to expiry), Red (Expired / Missing).

### 3.4 Core Module 4: PhilGEPS Opportunity Management & Sync
*   **Sync Capabilities:** Automated/Manual ingestion of public bidding opportunities from PhilGEPS for:
    *   Goods (Supply, Delivery, Maintenance)
    *   Infrastructure (Civil Works, Construction)
    *   Consulting Services (Advisory, Engineering Design)
*   **Advanced Filtering:** Filter by ABC (Approved Budget for the Contract), procuring entity, submission deadline, category, and regional location.
*   **Pipeline Kanban / List View:** Track opportunities across stages: *Discovered → Evaluating → Bid / No-Bid Decision → In Preparation → Submitted → Opened → Post-Eval → Awarded / Lost*.

### 3.5 Core Module 5: Universal Bid Package Builder
*   **Checklist Generator:** Automatically generates tailored submission checklists based on Procurement Type (Goods, Infra, Consulting) and ABC thresholds (e.g., Small Value Procurement vs. Competitive Bidding).
*   **Envelope Assembly:**
    *   *Envelope 1: Eligibility & Technical Documents* (Class "A" and Class "B" documents, Bid Security, Technical Specifications, Omnibus Sworn Statement).
    *   *Envelope 2: Financial Documents* (Bid Form, Price Schedules, Net Financial Contracting Capacity [NFCC] computation).
*   **Automated Form Fill:** Pull tenant config and project details to auto-populate GPPB-standard templates and downloadable forms.

### 3.6 Core Module 6: Analytics, Reporting & Audit Trails
*   **Bid Analytics Dashboard:** Win/Loss ratios, total pipeline value, success rate by procuring entity, average discount margins, and upcoming submission crunches.
*   **Audit Logging:** Immutable internal logs tracking who accessed, modified, or downloaded documents from the vault.
*   **Export Engine:** One-click generation of executive summary reports, compliance binders, and submission checklists in PDF and CSV formats.

### 3.7 Core Module 7: Local Integration & Sync Suite
*   **Local-First Architecture:** Designed to operate fully offline/locally for maximum data security and confidentiality.
*   **External Sync Hooks:** Webhook and API integration hooks for calendar sync (deadlines), local notification triggers (email/desktop alerts), and file synchronization backups.
---
## 4. Non-Functional Requirements
### 4.1 Security & Data Privacy
*   **At-Rest Encryption:** AES-256 encryption for all documents stored in the local vault.
*   **In-Transit Security:** TLS local/internal encryption for communication between services.
*   **Access Control:** Strict session management with multi-tier permissions (Company Owner vs. Bid Manager).
### 4.2 Performance & Reliability
*   **Speed:** Instant search across vault metadata and rapid page loads (<200ms API response times locally).
*   **Reliability:** Atomic database transactions ensuring state consistency during complex multi-document bid package assembly.

### 4.3 Maintainability & Reusability
*   Strict separation of concerns between code logic, UI presentation layers, and tenant configuration profiles.
*   Comprehensive inline code documentation and structured file organization.
---
## 5. Out of Scope (Current Release)
*   Direct API integration for automated live-submitting of bids into the official PhilGEPS portal (due to portal security constraints; manual final upload remains required).
*   Third-party legal verification or guarantee of financial statement accuracy.
*   Multi-company cloud SaaS hosting (system is optimized for isolated local container/machine deployment per instance).

## Technology Stack
# TECH STACK: BIDOCS - {{COMPANY_NAME}} Public Bidding Management System
## 1. Executive Summary & Philosophy
The technology stack for **BIDOCS** has been deliberately selected to optimize for **developer velocity, local-first execution, strict memory safety, and seamless white-label multi-tenancy**. Given the strict 10-day timeline and the requirement to run efficiently on a local development machine while maintaining enterprise-grade security for sensitive compliance documents (PCAB licenses, financial statements, tax clearances), this stack balances modern web development paradigms with robust data integrity.

Every technology choice directly supports the core constraints of BIDOCS:
- **White-Labeling:** Zero hardcoded brand assets or corporate profiles; dynamic runtime injection of `{{COMPANY_NAME}}`, `{{LOGO_PATH}}`, `{{BRAND_COLOR}}`, and regulatory identifiers (TIN, SEC/DTI, PCAB).
- **Legal Regime Compliance:** Flexible schema design capable of handling dual-regime metadata (RA 9184 vs. RA 12009 NGPA transition logic).
- **Document Security:** Encrypted local storage and secure file hashing for document version control.

---

## 2. Core Technology Stack Architecture

| Layer | Technology | Version / Specification | Justification & Role in BIDOCS |
| :--- | :--- | :--- | :--- |
| **Runtime & Language** | TypeScript / Node.js | Node.js v20+ LTS, TypeScript 5.x | End-to-end type safety prevents runtime errors in complex legal checklist validation (Goods, Infrastructure, Consulting). |
| **Frontend Framework** | Next.js (App Router) | v14+ (React 18+) | Server-side rendering (SSR) and Server Actions provide optimal performance and secure server-side handling of sensitive tenant configurations. |
| **Styling & UI Library** | Tailwind CSS + Shadcn UI | Latest | Rapid UI development with fully customizable theme variables, mapping directly to `{{BRAND_COLOR}}` and dynamic styling per tenant instance. |
| **Database & ORM** | PostgreSQL + Prisma ORM | PostgreSQL v15+, Prisma v5+ | Relational data integrity is mandatory for tracking complex parent-child hierarchies (Bidding Opportunity -> Lot -> Eligibility Checklists -> Document Versions). |
| **Local Environment** | Docker Desktop & Compose | Latest | Ensures identical environment reproduction across local machines and future staging/production deployments. |
| **Document Handling** | pdf-lib & node-forge | Latest | Local generation, manipulation, and cryptographic hashing/verification of bid packages and compliance forms without external API dependencies. |

---

## 3. Detailed Component Justifications

### 3.1 Frontend & UI: Next.js + Tailwind CSS + Shadcn UI
- **Why Next.js:** The App Router architecture allows optimal separation of server-rendered compliance dashboards and client-side interactive document assemblers. API routes and Server Actions securely handle business logic without exposing sensitive corporate configurations to the browser.
- **Why Tailwind + Shadcn:** Shadcn UI offers accessible, unstyled component primitives that live directly in the codebase. This makes deep customization for white-labeling effortless—changing the primary theme color to match `{{BRAND_COLOR}}` is achieved via a single CSS variable update.

### 3.2 Backend & Data Integrity: Node.js, TypeScript, & PostgreSQL
- **Why PostgreSQL:** Philippine government procurement tracking requires strict relational consistency. A bid package links to specific project categories (Goods, Infra, Consulting), references specific legal regimes (RA 9184 vs. RA 12009), and tracks expiration dates of dozens of compliance documents. PostgreSQL handles relational constraints and complex indexing flawlessly.
- **Why Prisma ORM:** Prisma provides strict schema enforcement and type safety from the database to the application layer. Its migration system ensures smooth database updates when evolving the legal compliance checklist schemas.

### 3.3 Security & Document Vault Architecture
- **Encryption at Rest:** All sensitive corporate documents (Tax Clearances, Mayor\'s Permits, Audited Financial Statements, PCAB licenses) are stored in an encrypted local volume (`./storage/vault`) with AES-256 encryption applied to file blobs before writing to disk.
- **Access Control:** Role-Based Access Control (RBAC) configured for Company Owners and Bid Managers, ensuring complete segregation of data when running multiple tenants on a single instance.

---

## 4. Multi-Tenant Configuration & White-Labeling Engine

To satisfy the requirement of reusing BIDOCS across multiple owned companies without touching source code, the system utilizes a **Configuration-Driven Architecture**:

1. **Tenant Definition File (`tenant.config.json`):**
   - Stores company name (`{{COMPANY_NAME}}`), logo path (`{{LOGO_PATH}}`), primary brand color (`{{BRAND_COLOR}}`), TIN, SEC/DTI registration, PCAB license number and category, and official business address.
2. **Dynamic Injection Middleware:**
   - At application boot and request time, the Next.js runtime injects the active tenant profile into the React context and API request headers.
3. **Asset Isolation:**
   - Uploaded logos and generated PDF outputs dynamically reference the active tenant config, ensuring exports (PhilGEPS compliance forms, bid proposals) automatically reflect the correct corporate identity.

---

## 5. Development & Tooling Setup

- **IDE:** Visual Studio Code (VS Code) with recommended extensions:
  - `Prisma.prisma` (Database schema syntax highlighting)
  - `dbaeumer.vscode-eslint` (Code quality)
  - `esbenp.prettier-vscode` (Code formatting)
  - `TailwindCSS.intellisense` (Styling efficiency)
- **Local Execution:** Run entirely offline via `docker-compose up` which spins up the PostgreSQL database, Redis (for background job processing of PhilGEPS sync queues), and the Next.js development server.

---

## 6. Future Scalability & Production Readiness

While the current focus is local execution for a 10-day build sprint, the chosen stack scales directly to a cloud deployment (AWS/Vercel/Supabase) by swapping local volume storage for secure cloud object storage (S3 with KMS encryption) and migrating the PostgreSQL instance to a managed service, requiring zero rewrites of core business logic.

## Project Structure
# 3. PROJECT STRUCTURE: BIDOCS ({{COMPANY_NAME}} Public Bidding Management System)

## 1. Directory Architecture Philosophy

The BIDOCS codebase and data store are architected to strictly separate core application logic, regulatory rulesets (RA 9184 / RA 12009 transition logic), dynamic tenant configurations, and encrypted document storage. This ensures that onboarding a secondary company requires zero modifications to application code—only the provisioning of a dedicated configuration file and a partitioned storage vault.

```text
bidocs/
├── .env.example                     # Environment variable templates (database URLs, encryption keys)
├── .gitignore                        # Excludes node_modules, build outputs, local DBs, and vault files
├── README.md                         # Project overview, white-label swap list, and quickstart guide
├── package.json                      # Dependencies, build scripts, and project metadata
├── tsconfig.json                     # TypeScript compiler configuration for strict type safety
├── docker-compose.yml                # Local orchestration for database, caching, and local storage
│
├── config/
│   ├── default.json                  # Global baseline system configurations
│   └── tenants/
│       ├── template.json             # Master tenant configuration template (White-label variables)
│       ├── company-alpha.json        # Production configuration for Company Alpha
│       └── company-beta.json         # Production configuration for Company Beta
│
├── docs/
│   ├── 01-master-plan.md             # Executive proposal and enterprise strategy
│   ├── 02-tech-stack.md              # Technology stack decisions and justifications
│   ├── 03-legal-framework.md         # Sourced summary of RA 9184, RA 12009, GPPB, and PhilGEPS
│   ├── 04-document-checklists.md     # Eligibility & requirement matrices for Goods, Infra, Consulting
│   └── 05-official-forms-dir.md      # Directory and links to PhilGEPS & GPPB downloadable forms
│
├── src/
│   ├── server.ts                     # Application entry point and server bootstrap
│   ├── app.ts                        # Express/Fastify application middleware and routing setup
│   │
│   ├── config/
│   │   └── tenantLoader.ts           # Dynamic tenant configuration resolver (In-memory & DB cache)
│   │
│   ├── database/
│   │   ├── connection.ts             # Prisma / TypeORM database connection client
│   │   ├── migrations/               # Database migration scripts (Schema for bids, items, vault, logs)
│   │   └── seeders/                  # Initial data seeders (Legal regimes, default document types)
│   │
│   ├── legal/
│   │   ├── regimeEvaluator.ts        # Transition logic engine (RA 9184 vs RA 12009 based on bid dates)
│   │   └── rulesets/
│   │       ├── ra9184.ts             # 2016 IRR rules, thresholds, and mandatory forms
│   │       └── ra12009.ts            # New Government Procurement Act (NGPA) rules & GPPB Res 02-2025
│   │
│   ├── modules/
│   │   ├── philgeps/                 # PhilGEPS opportunity scraper, API sync, and matching engine
│   │   │   ├── scraper.ts            # Automated notice parsing and opportunity ingestion
│   │   │   ├── matcher.ts            # Line-of-business relevance and keyword matching
│   │   │   └── syncService.ts        # Background sync queue for active notices
│   │   │
│   │   ├── vault/                    # Encrypted document vault for corporate credentials & exhibits
│   │   │   ├── vaultService.ts       # AES-256-GCM encryption, decryption, and versioning logic
│   │   │   └── expiryChecker.ts      # Automated expiry alerts for licenses, tax certs, and PCAB
│   │   │
│   │   ├── bidding/                  # Bid package assembly and compliance tracking
│   │   │   ├── packageBuilder.ts     # Checklist generator for Goods, Infrastructure, and Consulting
│   │   │   ├── validator.ts          # Completeness and pre-flight validation engine
│   │   │   └── trackingService.ts    # Lifecycle tracker (Submitted → Opened → Post-Qual → Awarded)
│   │   │
│   │   └── reporting/                # Analytics, win/loss metrics, and audit log generators
│   │       ├── analyticsEngine.ts    # Aggregation of bidding metrics across procurement types
│   │       └── exportService.ts      # PDF/Excel report generators for executive review
│   │
│   ├── middleware/
│   │   ├── auth.ts                   # Role-based access control (Owner vs Bid Manager)
│   │   ├── tenantContext.ts          # Tenant isolation middleware based on subdomain or headers
│   │   └── errorHandler.ts           # Global error handling and logging middleware
│   │
│   └── utils/
│       ├── logger.ts                 # Structured logging utility (Winston/Pino)
│       └── crypto.ts                 # Cryptographic helpers for secure vault operations
│
├── tests/
│   ├── unit/
│   │   ├── regimeEvaluator.test.ts   # Unit tests for legal transition rules
│   │   └── packageBuilder.test.ts    # Unit tests for checklist generation
│   ├── integration/
│   │   ├── philgepsSync.test.ts      # Integration tests for opportunity ingestion
│   │   └── vaultSecurity.test.ts     # Integration tests for file encryption/decryption
│   └── fixtures/
│       └── sampleBids.json           # Test datasets for mock bidding workflows
│
└── storage/
    └── vault/                        # Local secure storage directory for encrypted document blobs
        ├── .gitkeep
        └── encrypted_indices/        # Metadata registry for vault files
```

## 2. Deep-Dive File and Directory Explanations

### `config/` Directory
- **`default.json`**: Contains global baseline parameters such as default timeout intervals, database connection pooling limits, and fallback sync frequencies.
- **`tenants/template.json`**: The master white-label configuration schema. It defines placeholders for `{{COMPANY_NAME}}`, `{{LOGO_PATH}}`, `{{BRAND_COLOR}}`, Tax Identification Number (TIN), PhilGEPS merchant registration number, PCAB license details, SEC/DTI registration records, and designated corporate signatories. To onboard a secondary company, duplicate this template, populate the business-specific credentials, and save it as `[company-name].json`.

### `docs/` Directory
- **`01-master-plan.md`**: Comprehensive enterprise proposal detailing business value, system architecture, deployment strategy, and 10-day execution roadmap tailored for stakeholders and business partners.
- **`02-tech-stack.md`**: Complete justification of the local-first, memory-safe technology stack (Node.js/TypeScript, SQLite/PostgreSQL, AES-256 encryption, local file storage) chosen for maximum performance, security, and maintainability.
- **`03-legal-framework.md`**: Rigorous breakdown of Philippine public procurement law, contrasting RA 9184 (2003) and RA 12009 (NGPA, effective 2024, IRR approved via GPPB Res. 02-2025), complete with primary source citations.
- **`04-document-checklists.md`**: Exhaustive eligibility, technical, and financial document requirements structured into three distinct matrices: Goods, Infrastructure Projects, and Consulting Services.
- **`05-official-forms-dir.md`**: Curated directory of official downloadable PhilGEPS and GPPB standard forms, organized by procurement category and bidding stage.

### `src/` Directory
- **`server.ts` & `app.ts`**: Bootstrap files initializing the HTTP server, applying security headers, mounting middleware, and starting background synchronization workers.
- **`config/tenantLoader.ts`**: Runtime utility responsible for reading, validating, and caching tenant configuration profiles, injecting white-label parameters dynamically into requests and rendering contexts.
- **`database/`**: Houses the ORM connection schemas (`migrations/`) and baseline data seeders (`seeders/`) that pre-populate legal regimes, document types, and initial checklist templates.
- **`legal/regimeEvaluator.ts`**: The core transition logic engine. It analyzes an opportunity's Advertisement Date against transition thresholds to determine whether the procurement is governed by RA 9184 (or its 2016 IRR) or the newly enacted RA 12009 (NGPA).
- **`modules/philgeps/`**: Integrates automated parsing of PhilGEPS opportunity notices. The `matcher.ts` filters notices against the active tenant's registered line of business and keywords, while `syncService.ts` maintains an up-to-date local cache of relevant public biddings.
- **`modules/vault/`**: Manages the secure storage of sensitive corporate credentials, tax clearances, SEC papers, and PCAB certificates. Utilizes AES-256-GCM encryption (`vaultService.ts`) and actively monitors document validity periods (`expiryChecker.ts`) to flag expiring documents before bid assembly.
- **`modules/bidding/`**: Implements the bid package workflow. `packageBuilder.ts` generates dynamic checklists for Goods, Infra, and Consulting; `validator.ts` runs pre-flight completeness checks; and `trackingService.ts` logs milestones from initial opportunity discovery through post-qualification to award or loss.
- **`modules/reporting/`**: Aggregates bidding metrics, win/loss ratios, compliance histories, and audit trails into exportable formats (`exportService.ts`) for executive review.

## 3. White-Label & Multi-Tenant Isolation Strategy

To achieve seamless reuse across multiple companies owned by the business operator without modifying source code:
1. **Configuration Driven Branding**: The UI, document generation templates, and cover sheets pull branding variables (`{{COMPANY_NAME}}`, `{{LOGO_PATH}}`, `{{BRAND_COLOR}}`) exclusively from the active tenant JSON file.
2. **Partitioned Storage Vaults**: Encrypted document assets are stored in isolated tenant subdirectories under `storage/vault/[tenant_id]/`, preventing cross-company data leakage.
3. **Tenant Context Middleware**: Every incoming request resolves the tenant context (`tenantContext.ts`) via subdomain matching or explicit configuration headers, ensuring database queries and file operations are strictly scoped to the authorized company instance."

## Database Schema Design
# SCHEMADESIGN: BIDOCS ({{COMPANY_NAME}} Public Bidding Management System)

## 1. Introduction & Database Architecture Overview

The BIDOCS database schema is engineered for a secure, multi-tenant, and legally compliant public bidding management system tailored to Philippine procurement laws (RA 9184 and RA 12009 / NGPA). It supports multiple operating entities (tenants) under single or multi-tenant deployments, handles dual-regime legal tracking (RA 9184 vs. RA 12009/NGPA transition rules), manages a dynamic document vault with versioning and expiration tracking, and structures complex bid packages across Goods, Infrastructure, and Consulting Services.

### Key Architectural Principles
- **Tenant Isolation:** All core operational tables include `tenant_id` to cleanly separate multi-company configurations, credentials, corporate profiles, and document vaults without touching code.
- **Regime-Aware Structuring:** Procurement opportunities, checklists, and compliance validation rules explicitly link to a legal regime (`RA_9184` or `RA_12009_NGPA`), supporting transitional compliance requirements.
- **Auditability & Traceability:** Immutable audit logs track every document upload, version change, checklist state toggle, and status update across the bid lifecycle.
- **Data Integrity:** Strict foreign key constraints, enumerated types, and check constraints ensure state machine validity (e.g., preventing a bid from entering `AWARDED` without passing `POST_QUALIFICATION`).

---

## 2. Entity-Relationship (ER) Overview & Core Domains

The schema is divided into five core functional domains:
1. **Tenant & Identity Domain:** Manages white-label configuration, corporate identities (TIN, SEC/DTI, PCAB), user roles, and system settings.
2. **PhilGEPS & Opportunity Domain:** Stores scraped or manually entered procurement opportunities, classification (Goods, Infrastructure, Consulting), and governing legal frameworks.
3. **Document Vault Domain:** Tracks corporate compliance documents, validity dates, source statutory requirements, secure storage paths, and version histories.
4. **Bid Lifecycle & Package Domain:** Manages bid intents, multi-envelope assembly (Eligibility/Technical and Financial), checklist item states, and submission tracking.
5. **Reporting, Analytics & Integration Domain:** Captures audit trails, synchronization logs, metrics snapshots, and notification queues.

---

## 3. Database Schema Definitions (SQL DDL Models)

### 3.1. Tenant & Identity Domain

```sql
-- Tenants table for white-label multi-company support
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    brand_code VARCHAR(50) UNIQUE NOT NULL,
    logo_path VARCHAR(512),
    brand_color VARCHAR(7) DEFAULT '#0F172A',
    tin VARCHAR(30) NOT NULL,
    sec_dti_registration_no VARCHAR(100) NOT NULL,
    pcab_license_no VARCHAR(100),
    primary_address TEXT NOT NULL,
    authorized_signatory_name VARCHAR(255) NOT NULL,
    authorized_signatory_title VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table restricted to company owners and bid managers
CREATE TYPE user_role AS ENUM ('COMPANY_OWNER', 'BID_MANAGER', 'SYSTEM_ADMIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'BID_MANAGER',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2. PhilGEPS & Opportunity Domain

```sql
-- Procurement Types & Legal Regimes
CREATE TYPE procurement_type AS ENUM ('GOODS', 'INFRASTRUCTURE', 'CONSULTING_SERVICES');
CREATE TYPE legal_regime AS ENUM ('RA_9184', 'RA_12009_NGPA');
CREATE TYPE opportunity_status AS ENUM ('OPEN', 'CLOSED', 'AWARDED_TO_OTHERS', 'CANCELLED');

-- Opportunities table tracking PhilGEPS listings
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    philgeps_reference_no VARCHAR(100) UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    procuring_entity VARCHAR(255) NOT NULL,
    procurement_type procurement_type NOT NULL,
    legal_regime legal_regime NOT NULL DEFAULT 'RA_12009_NGPA',
        -- Transition rule flag if procuring entity explicitly uses 2016 IRR of RA 9184 during transition window
    approved_budget_for_contract NUMERIC(15, 2) NOT NULL,
    submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    bid_opening_date TIMESTAMP WITH TIME ZONE,
    status opportunity_status NOT NULL DEFAULT 'OPEN',
    source_url VARCHAR(1000),
    raw_payload JSONB, -- Stores full raw scrape/API sync payload for audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3. Document Vault Domain

```sql
-- Document Categories & Vault Storage
CREATE TYPE vault_doc_category AS ENUM ('ELIGIBILITY_CLASS_A', 'ELIGIBILITY_CLASS_B', 'TECHNICAL', 'FINANCIAL', 'CORPORATE_LEGAL');
CREATE TYPE doc_status AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'ARCHIVED');

CREATE TABLE document_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    category vault_doc_category NOT NULL,
    procurement_type_applicability procurement_type[] DEFAULT '{GOODS,INFRASTRUCTURE,CONSULTING_SERVICES}',
    legal_basis_reference VARCHAR(255) NOT NULL, -- e.g., "RA 12009 Section X / IRR Rule Y"
    version_number INTEGER NOT NULL DEFAULT 1,
    file_path VARCHAR(1024) NOT NULL, -- Secured local storage path or encrypted bucket path
    file_hash VARCHAR(64) NOT NULL, -- SHA-256 integrity hash
    file_size_bytes BIGINT NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    status doc_status NOT NULL DEFAULT 'ACTIVE',
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Version history tracking for document vault
CREATE TABLE document_vault_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES document_vault(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    replaced_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4. Bid Lifecycle & Package Domain

```sql
-- Bid tracking and status pipeline
CREATE TYPE bid_lifecycle_status AS ENUM (
    'INTENT_TO_BID',
    'PACKAGE_ASSEMBLING',
    'DOCUMENTS_REVIEWED',
    'SUBMITTED',
    'OPENED',
    'POST_QUALIFICATION',
    'AWARDED',
    'LOST',
    'DISQUALIFIED'
);

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    assigned_manager_id UUID REFERENCES users(id),
    lifecycle_status bid_lifecycle_status NOT NULL DEFAULT 'INTENT_TO_BID',
    submission_date TIMESTAMP WITH TIME ZONE,
    bid_price_offered NUMERIC(15, 2),
    post_qual_notes TEXT,
    award_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Checklist Templates & Dynamic Instance Items based on RA 9184 / RA 12009
CREATE TYPE envelope_type AS ENUM ('ENVELOPE_1_ELIGIBILITY_TECHNICAL', 'ENVELOPE_2_FINANCIAL');
CREATE TYPE checklist_item_status AS ENUM ('MISSING', 'ATTACHED', 'VERIFIED_VALID', 'EXPIRED', 'NOT_APPLICABLE');

CREATE TABLE bid_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
    envelope envelope_type NOT NULL,
    requirement_code VARCHAR(50) NOT NULL, -- e.g., 'SEC_REG', 'PCAB_LICENSE', 'NFCC', 'BID_SEC_DECL'
    requirement_name VARCHAR(255) NOT NULL,
    legal_regime legal_regime NOT NULL,
    procurement_type procurement_type NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    status checklist_item_status NOT NULL DEFAULT 'MISSING',
    linked_vault_document_id UUID REFERENCES document_vault(id) ON DELETE SET NULL,
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5. Reporting, Analytics & Integration Domain

```sql
-- Audit Logs for comprehensive security and traceability
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    ip_address VARCHAR(45),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PhilGEPS Sync & Notification Logs
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    sync_source VARCHAR(100) DEFAULT 'PHILGEPS_PORTAL',
    records_fetched INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'PARTIAL', 'FAILED'
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(100) NOT NULL, -- e.g., 'DOC_EXPIRY_WARNING', 'DEADLINE_ALERT', 'BID_STATUS_UPDATE'
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Indexing Strategy & Performance Optimization

To ensure fast lookup speeds, memory safety, and optimal performance on local computer deployments:
- **Tenant Isolation Indexes:** `CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id);`, `CREATE INDEX idx_vault_tenant ON document_vault(tenant_id);`, `CREATE INDEX idx_bids_tenant ON bids(tenant_id);`
- **Compliance & Expiry Indexes:** `CREATE INDEX idx_vault_expiry ON document_vault(expiry_date) WHERE status = 'ACTIVE';`, `CREATE INDEX idx_opportunities_deadline ON opportunities(submission_deadline) WHERE status = 'OPEN';`
- **Lookup Indexes:** `CREATE INDEX idx_bid_checklists_bid ON bid_checklists(bid_id);`, `CREATE INDEX idx_audit_logs_tenant_time ON audit_logs(tenant_id, created_at DESC);`

---

## 5. Security, Vault Storage & Data Integrity Constraints

1. **Vault File Security:** Physical or container-mounted storage paths referenced in `document_vault.file_path` must be secured outside web-accessible roots. Cryptographic SHA-256 hashes (`file_hash`) ensure files are not altered at rest.
2. **Cascading Deletes & Soft Deletes:** Tenant deletions cascade securely to associated records. Core entities utilize status enums (`is_active`, `status`) to prevent accidental permanent data loss of legal bidding histories.
3. **Transition Rule Enforcement:** `opportunities.legal_regime` and `bid_checklists.legal_regime` ensure checklist generation dynamically adapts to whether the tender is governed by RA 9184 (2016 IRR) or RA 12009 (NGPA).

## User Flow
# USERFLOW: User Flow & Interaction Patterns
{{COMPANY_NAME}} Public Bidding Management System (BIDOCS)

## 1. Document Overview & Purpose
This document defines the user journeys, screen wireframe descriptions, interaction patterns, and navigation pathways for BIDOCS. The system serves two primary roles: the Company Owner (executive oversight, master configuration, financial approval) and the Bid Manager (day-to-day opportunity discovery, document vault maintenance, compliance checklist execution, and package assembly).

All UI layouts must support white-label tokenization using `{{BRAND_COLOR}}`, `{{LOGO_PATH}}`, and dynamic tenant configuration variables without hardcoded enterprise data.

---

## 2. Global Navigation & Layout Structure

### 2.1 Shell Architecture
- **Top Navigation Bar (Header):**
  - Left: Dynamic Brand Logo (`{{LOGO_PATH}}`) linked to Dashboard.
  - Center: Active Company Switcher dropdown (for multi-tenant or multi-company deployment) displaying active company profile, active legal regime mode (RA 9184 vs. RA 12009 NGPA), and compliance health indicator.
  - Right: System Notifications bell (PhilGEPS sync alerts, document expiry warnings), Global Search bar (Cmd+K / Ctrl+K), and User Profile / Settings menu.
- **Left Sidebar (Primary Navigation):**
  1. **Dashboard** (`/dashboard`) - High-level metrics, active bids, compliance status.
  2. **Opportunity Finder** (`/opportunities`) - PhilGEPS feed, scrapers, filtering by classification (Goods, Infra, Consulting).
  3. **Document Vault** (`/vault`) - Centralized corporate repository for legal, financial, and technical documents.
  4. **Bid Packages** (`/bids`) - Active, submitted, and historical bid workspaces.
  5. **Forms & Templates** (`/forms`) - GPPB and PhilGEPS downloadable official forms directory.
  6. **Reports & Analytics** (`/reports`) - Win/loss rates, financial summaries, compliance audits.
  7. **Tenant Settings** (`/settings`) - White-label configuration, company profiles, signatories, permissions.

---

## 3. Detailed User Journeys & Wireframe Descriptions

### Journey 1: Tenant Setup & White-Label Initialization
*Actor: Company Owner*
*Pre-condition: First-time system deployment or onboarding a new corporate entity.*-

1. **Step 1: Access Settings**
   - User navigates to `/settings` -> Company Profile.
2. **Step 2: Enter Corporate Identifiers**
   - Form fields: Legal Business Name, Trade Name, SEC/DTI Registration Number, TIN, Business Address, PCAB License Number (if Infrastructure), PhilGEPS Platinum Membership Number.
3. **Step 3: Configure Branding & Assets**
   - Upload logo file (populating `{{LOGO_PATH}}`).
   - Select primary brand color (populating `{{BRAND_COLOR}}`).
4. **Step 4: Register Designated Signatories**
   - Add authorized representatives, Board Secretary, and General Manager details with specimen signatures.
5. **Step 5: Save & Validate**
   - System writes to tenant configuration file (`config/tenants/[company-id].json`). UI instantly updates with the new brand tokens.

---

### Journey 2: Opportunity Discovery & Legal Regime Determination
*Actor: Bid Manager*
*Goal: Scan PhilGEPS feeds for relevant projects and determine whether RA 9184 or RA 12009 (NGPA) governs.*-

1. **Step 1: Open Opportunity Finder**
   - User navigates to `/opportunities`. Default view displays synced feeds categorized by Goods, Infrastructure, and Consulting Services.
2. **Step 2: Filter & Search**
   - User filters by ABC (Approved Budget for the Contract), procuring entity, keyword, and submission deadline.
3. **Step 3: Evaluate Opportunity Details**
   - User clicks an opportunity card. Detail drawer opens showing:
     - Project Title, ABC, Procuring Entity, Bid Doc Fee, Submission Deadline.
     - **Legal Regime Badge:** System auto-detects governing law based on advertisement date and project classification (Transition Logic: RA 9184 2016 IRR vs RA 12009 NGPA).
4. **Step 4: Import to Workspace**
   - User clicks "Create Bid Project". System initializes a workspace and generates the specific compliance checklist based on the procurement type and legal regime.

---

### Journey 3: Document Vault & Expiry Management
*Actor: Bid Manager / Company Owner*
*Goal: Maintain up-to-date compliance documents (Tax Clearances, SEC Certifications, Mayor's Permit, PCAB).*-

1. **Step 1: Access Document Vault**
   - User navigates to `/vault`. Dashboard highlights expiring or expired documents in red/yellow.
2. **Step 2: Upload / Update Document**
   - User clicks "Add New Document".
   - Selects Category (Eligibility - Class A/B, Technical, Financial).
   - Uploads PDF file.
   - Enters metadata: Document Name, Version Number, Issuing Agency, Issue Date, Expiry Date, Source Law Section.
3. **Step 3: Automated Expiry Tracking**
   - System schedules notification triggers at 60, 30, and 7 days prior to expiry.
   - Linked bid packages automatically flag if an attached document expires before the bid submission deadline.

---

### Journey 4: Bid Package Assembly & Compliance Checklist Execution
*Actor: Bid Manager*
*Goal: Assemble a 100% compliant bid package across Eligibility, Technical, and Financial envelopes (Envelope 1 & Envelope 2).*-

1. **Step 1: Open Bid Workspace**
   - User navigates to `/bids/[id]`.
2. **Step 2: Review Compliance Checklist**
   - Interactive split-screen interface:
     - **Left Panel:** Categorized checklist (Envelope 1: Eligibility & Technical Documents; Envelope 2: Financial Documents).
     - **Right Panel:** Document preview / Form builder / Vault selector.
3. **Step 3: Map Vault Documents to Checklist Items**
   - For each requirement (e.g., PhilGEPS Platinum Certificate, Statement of Single Largest Completed Contract - SLCC, Bid Security), the user links the corresponding verified document from the Document Vault.
   - If a custom form is required (e.g., Bid Securing Declaration, Omnibus Sworn Statement), user clicks "Generate from Template". System auto-populates tenant details (Name, TIN, Signatory) into the official GPPB form template.
4. **Step 4: Real-Time Completeness Audit**
   - System runs integrity check: Verifies all mandatory fields are filled, no documents are expired as of bid date, and signing authorities match tenant profile.
   - Status indicator changes from "Incomplete" (Red) to "Ready for Review" (Green).
5. **Step 5: Executive Review & Approval**
   - Bid Manager triggers "Request Owner Approval".
   - Company Owner receives notification, reviews summary, and clicks "Approve for Submission".

---

### Journey 5: Tracking & Lifecycle Management
*Actor: Company Owner / Bid Manager*
*Goal: Monitor bid progress from submission through post-qualification to award/loss.*-

1. **Step 1: Kanban / Pipeline View**
   - User navigates to `/bids`. View switches to a Kanban board with columns: `Drafting` → `Ready` → `Submitted (Waiting Opening)` → `Post-Qualification` → `Awarded` / `Lost` / `Failed`.
2. **Step 2: Status Updates**
   - User drags cards across columns or updates status via detail modal, logging post-opening remarks, Lowest Calculated Bid (LCB) status, and Notice of Award (NOA) receipt dates.
3. **Step 3: Analytics & Reporting**
   - User navigates to `/reports` to view win/loss ratios, total ABC won vs. bid, and upcoming submission calendar.

---

## 4. Interaction Patterns & UI States

- **Loading States:** Skeleton screens for data grids and PhilGEPS feed synchronization.
- **Empty States:** Friendly illustrations and clear call-to-action buttons (e.g., \"No documents in vault. Click here to upload your first compliance document.\").
- **Error Handling:** Inline validation on all form inputs, explicit toast notifications for sync failures, and hard-blocking alerts if attempting to finalize a bid package with expired documents.
- **Keyboard Shortcuts:** `Cmd+K` for global search, `Cmd+N` for new bid workspace, `Esc` to close drawers and modals.

## 5. White-Label & Multi-Tenant Behavior
- All UI components reference CSS variables derived from tenant configuration (`--brand-primary: {{BRAND_COLOR}}`).
- Header logo dynamically resolves to `{{LOGO_PATH}}`.
- Document templates dynamically inject tenant metadata (TIN, Business Address, PCAB License) into generated forms without altering application source code."

## Styling Guidelines
# BIDOCS Styling Guidelines & Design System

## 1. Overview

This document defines the design system, color palette, typography, and UI/UX principles for **BIDOCS** ({{COMPANY_NAME}} Public Bidding Management System). 

Because BIDOCS is designed as a white-labelable, multi-tenant platform for Philippine government procurement (operating under the dual regimes of RA 9184 and RA 12009 / NGPA), the design system must prioritize:
- **Extreme Clarity & Compliance:** High-density data presentation (bidding checklists, expiration trackers, technical/financial envelopes) without visual clutter.
- **Dynamic White-Labeling:** CSS variables for all brand-sensitive elements (`{{BRAND_COLOR}}`, `{{LOGO_PATH}}`) to allow instantaneous re-skinning per company instance.
- **Audit-Ready Readability:** Typography and color coding specifically optimized for compliance officers, business owners, and bid managers reviewing complex legal constraints, deadlines, and document versions.

---

## 2. White-Label & Dynamic Styling Architecture

BIDOCS uses a centralized CSS Custom Properties (Variables) architecture. No brand colors, company names, or logos are hardcoded into the component styles.

### 2.1 CSS Variables (`globals.css`)
```css
:root {
  /* White-Label Placeholders */
  --brand-primary: {{BRAND_COLOR}};
  --brand-primary-hover: var(--brand-primary-dark, #0f2d5c);
  --brand-logo-path: url('{{LOGO_PATH}}');

  /* System Semantic Colors */
  --color-success: #107c10; /* Valid / Submitted / Awarded */
  --color-success-bg: #dff6dd;
  --color-warning: #f7630c; /* Expiring Soon / Post-Qualification */
  --color-warning-bg: #fff4ce;
  --color-danger: #a80000; /* Expired / Missing / Disqualified */
  --color-danger-bg: #fde7e9;
  --color-info: #0078d4;   /* Transition Regime / Notice */
  --color-info-bg: #eff6fc;

  /* Neutral Palette (Data-Dense Enterprise UI) */
  --bg-app: #fdfdfd;
  --bg-surface: #ffffff;
  --bg-subtle: #f3f2f1;
  --border-color: #edebe9;
  --text-main: #201f1e;
  --text-muted: #605e5c;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', Consolas, Monaco, monospace;

  /* Spacing & Layout */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.05);
}
```

---

## 3. Color Palette

The BIDOCS color system balances authoritative institutional trust (deep blues/grays) with urgent, high-visibility compliance indicators essential for government procurement deadlines.

### 3.1 Primary Brand Color (`{{BRAND_COLOR}}`)
- Used for primary action buttons, active navigation states, header branding, and focus rings.
- Must maintain a minimum contrast ratio of 4.5:1 against white backgrounds for WCAG AA compliance.

### 3.2 Functional / Status Colors
- **Success (`#107c10`):** Used for valid documents, fully compliant bid packages, and "Awarded" statuses.
- **Warning (`#f7630c`):** Used for documents expiring within 30/60 days, PhilGEPS opportunities closing soon, and "Post-Qualification" stages.
- **Danger (`#a80000`):** Used for expired tax clearances, missing mandatory PhilGEPS/GPPB forms, and "Disqualified" or "Failed" statuses.
- **Information (`#0078d4`):** Used to indicate RA 9184 vs. RA 12009 (NGPA) transition regime tags and system sync notifications.

---

## 4. Typography

BIDOCS uses a clean sans-serif stack for general UI and a monospace font for document hashes, TIN numbers, PCAB license numbers, and PhilGEPS Reference Numbers.

### 4.1 Hierarchy
- **Page Title (`h1`):** 24px / Bold (700) / Line-height: 32px — Used for main dashboard headers and module titles.
- **Section Header (`h2`):** 20px / Semibold (600) / Line-height: 28px — Used for major view sections (e.g., "Eligibility Checklist: Goods").
- **Card / Table Title (`h3`):** 16px / Semibold (600) / Line-height: 24px — Used for card headers and modal titles.
- **Body Text (`p`, `span`):** 14px / Regular (400) / Line-height: 20px — Standard data display.
- **Metadata / Captions:** 12px / Regular (400) / Line-height: 16px — Used for timestamps, source laws, and helper text.
- **Data / Codes (`code`, `.mono`):** 13px / Medium (500) / Font Family: `--font-mono` — Used for PhilGEPS Ref Nos., TIN, SEC/DTI registration numbers, and version hashes.

---

## 5. UI/UX Principles

### 5.1 Compliance-First Data Density
- Government bidding requires tracking dozens of granular fields per package. Tables must be compact, featuring clean row dividers, hover states, and sticky headers.
- Use badges and micro-tags extensively for statuses (e.g., [RA 12009 Transition], [Expired], [Submitted]).

### 5.2 Zero-Ambiguity Legal Regimes
- Because the system operates across the 3-year transition period between RA 9184 and RA 12009 (NGPA), UI elements governing bid packages must explicitly display the governing legal regime badge next to the project title.

### 5.3 Error Prevention & Audit Readiness
- Destructive actions (such as overriding a document version or archiving a bid package) require explicit confirmation dialogs.
- Expiry warnings must be proactive: documents approaching expiration within 30 days must trigger persistent amber banners on the company dashboard.

### 5.4 Responsive & Local-First Usability
- Designed primarily for desktop/laptop use by company owners and bid managers working in high-focus environments.
- Fully functional on local environments via secure modern browsers, ensuring zero data leakage of sensitive corporate credentials and financial documents.

---

## 6. Component Guidelines

### 6.1 Buttons
- **Primary:** Background `var(--brand-primary)`, text white, rounded corners (`var(--radius-md)`). Hover shifts to `var(--brand-primary-hover)`.
- **Secondary:** Border 1px solid `var(--border-color)`, background transparent, text `var(--text-main)`.
- **Danger:** Background `var(--color-danger)`, text white. Used strictly for irreversible actions.

### 6.2 Document Vault Cards
- Clean white cards (`var(--bg-surface)`) with subtle shadows (`var(--shadow-subtle)`).
- Must display: Document Name, Version, Expiry Date (with color-coded badge), Source Law Section, and direct action triggers (View, Update Version, Download Official Form).

### 6.3 Status Badges
- Small pill-shaped tags (`padding: 2px 8px`, `border-radius: 12px`, `font-size: 12px`, `font-weight: 500`).
- Background and text color automatically derive from the status semantic variables (`success`, `warning`, `danger`, `info`).
