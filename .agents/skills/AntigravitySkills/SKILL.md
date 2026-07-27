---
name: antigravity-master-architect
description: Master engineering standards, architecture design, React/TypeScript, Electron IPC, Express API, Database normalization, PDF engineering, UI/UX accessibility, Security, Testing, and Philippine Procurement (PhilGEPS/GPPB) compliance for BidMAE.
---

# Master Architect & Engineering Skill

Comprehensive operational guidelines, architectural principles, technical standards, security policies, and domain compliance rules for BidMAE.

---

## 1. Core Architectural & Engineering Principles

### 🏛️ Architecture & Clean Code Standards
- **SOLID, DRY, KISS**: Enforce Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. Keep components DRY (Don't Repeat Yourself) and simple (KISS).
- **Feature-First Architecture**: Group code by feature domains rather than technical layer types to minimize coupling and maximize cohesion.
- **Strict Single Source of Truth**: Maintain deterministic state ownership across client and server logic.
- **Architectural Decision Records (ADR)**: Document major design decisions, trade-offs, and migration paths before implementation.
- **Technical Debt & Legacy Maintenance**: Continuously refactor with backward compatibility, graceful degradation, and clear deprecation paths.

### 🔄 General Development Rules
- **Analyze Before Coding**: Explain root causes and architectural impacts prior to modifying source code.
- **Reuse Over Duplication**: Never write duplicate logic; audit existing utilities before introducing new functions.
- **Production-Ready Standard**: All code written must be production-ready, clean, formatted, and strictly typed.

---

## 2. Technology Stack Guidelines

### ⚡ React & TypeScript Standards
- **Component Architecture**: Prefer functional components with custom hooks. Keep components modular, maintainable, and scalable.
- **Strict Typing**: Strict mode enabled. Explicitly avoid using `any` (use `unknown`, generics, or exact TypeScript interfaces).
- **Performance & Code Splitting**: Use `React.lazy()` and `Suspense` for route and heavy component level loading. Optimize rendering with `useMemo` and `useCallback` where necessary.

### 🖥️ Electron Desktop Architecture
- **Context Isolation**: Always enable `contextIsolation: true` in BrowserWindow webPreferences.
- **Secure Preload Scripts**: Use `contextBridge.exposeInMainWorld` to expose minimum necessary APIs to the renderer process.
- **IPC Security & Validation**: Validate channel names and payload structures on all IPC invocation handlers (`ipcMain.handle` / `ipcRenderer.invoke`).

### 🌐 Express API & Service Layer
- **Layered Architecture**: Enforce strict separation of concerns (Controllers -> Services -> Repositories/Data Access Layer).
- **Input Validation**: Validate incoming requests using schema validators (e.g. Zod or Joi) before hitting business logic.
- **Centralized Error Middleware**: Catch all errors in async handlers and route them to standard Express error-handling middleware.

### 🗄️ Database Design & Optimization
- **Database Normalization**: Design normalized relational schemas (3NF) to prevent data anomalies.
- **Foreign Key Indexing**: Always index foreign key columns and frequently queried attributes.
- **Transaction Safety**: Wrap multi-step data mutations in database transactions (`BEGIN` / `COMMIT` / `ROLLBACK`) to guarantee ACID compliance.

### 📄 PDF Engineering & Document Generation
- **Vector Quality Preservation**: Preserve vector fidelity, scalable fonts, and crisp graphics during PDF creation/manipulation.
- **Efficient Page Merging**: Utilize pdf-lib `copyPages()` for merging documents without re-rendering vector streams into raster images.
- **Page Orientation & Margins**: Retain original document page orientation (Portrait / Landscape).
- **Legal Print Standards**: Auto-adjust cell heights, line heights, and margins for Legal size (13" x 8.5" Landscape) documents without text clipping or proof column overflow.

---

## 3. UI/UX, Security & Testing Quality Assurance

### 🎨 UI/UX & Accessibility (A11y)
- **WCAG AA Compliance**: Ensure high contrast ratios, accessible ARIA labels, and full keyboard navigation.
- **Responsive & Spacing System**: Design with consistent spacing tokens, flexible dynamic math layout calculations, and responsive visual flow.

### 🔒 Security & Privacy Practices
- **Input Sanitization**: Sanitize all user inputs to prevent XSS, CSRF, and SQL Injection vulnerabilities.
- **Credential & Password Hashing**: Hash sensitive data using strong cryptographic algorithms (Argon2 or bcrypt). Never store plain passwords or secrets.
- **Principle of Least Privilege**: Scope system execution, storage keys, and user permissions to the minimal necessary footprint.

### 🧪 Testing Strategy & QA
- **Multi-Tier Testing**: Maintain Unit tests for business logic, Integration tests for API/IPC boundaries, and End-to-End (E2E) tests for critical user flows.
- **Permanent Fixes**: Write regression tests for bug fixes to prevent future regressions.

---

## 4. Philippine Procurement & Legal Compliance (PhilGEPS / GPPB)

### 🇵🇭 Domain Terminology & Legal Wording
- **Terminology Preservation**: Preserve statutory procurement terms (e.g., PhilGEPS, GPPB, BAC, ABC, SLCC, NFCC, JVA, BSD, PCAB, AFS, OSS).
- **Immutable Legal Templates**: Do not alter, modify, or summarize mandatory legal document wording or statutory affidavits without explicit authority.
- **Document Isolation**: Enforce zero cross-project data leakage across bidding packages and contract templates.

---

## 5. System-Wide Zero Black-Screen & PDF Perfection Rules

### 🛡️ System-Wide Zero Black-Screen Protection
- **Mandatory React Error Boundaries**: Every top-level view and document editor MUST be wrapped in a `<VaultErrorBoundary>` component.
- **IndexedDB PDF Binary Offloading**: Heavy base64 PDF binary strings MUST be offloaded to IndexedDB (`savePdfData`) instead of `localStorage`.
- **Safe Quota Writes**: Wrap all `localStorage.setItem` calls in `try/catch` blocks to catch quota warnings safely.
- **Unique List Keys**: Mapped list elements in React MUST use unique item primary keys (`key={item.id}`).

### 📄 PDF Layout, Import, Export & Print Perfection
- **Legal Dimensions**: Standardize Legal Portrait (`8.5in` × `13in`) and Legal Landscape (`13in` × `8.5in`).
- **High-Resolution Canvas Slicing**: Render document pages using `html2canvas` at `scale: 2` or `scale: 3` with background `#ffffff` to guarantee crisp text.
- **Vector PDF Preservation**: Uploaded external PDF attachments are merged using native `copyPages()` via `pdf-lib` to preserve original vector quality.
- **Zero Trailing Blank Pages**: Suppress trailing page breaks on final elements (`:last-child { page-break-after: avoid !important; }`) and ignore canvas residual whitespace (< 30px) in `pdfExportEngine.ts`.
- **Clean Print Layout**: Enforce `@page { size: 8.5in 13in; margin: 0mm; }` in print CSS and hide web app UI during `window.print()`.

---

## 6. Domain Specialist Responsibilities

- **UX Architect**: Intuitive user flows, clear forms, zero friction.
- **Data Modeler**: Schema integrity, performance queries, query optimization.
- **Security & Audit**: Vulnerability scanning, dependency checks, zero plain-text credentials.
- **CI/CD & DevOps**: Automated build pipelines, release reliability, zero downtime.
- **Code Review & Mentorship**: Clear technical feedback, knowledge sharing, architecture validation.
