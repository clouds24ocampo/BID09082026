# 🤖 BiDOCS Multi-Agent Command Center & Quick Reference

> All **79 skills + Context7 MCP** from `.agent/skills-and-plugins-final.md` are now organized into **10 specialized agent roles** ready to assist you on demand.

---

## ⚡ Quick Agent Summon Guide

You can summon any specialized agent by including its handle or role in your prompt:

### 1. 🏗️ `@agent-architect` — System Architect & Planner
- **When to use**: Planning new features, breaking down complex tasks, designing system boundaries.
- **Example Prompts**:
  - *"@agent-architect: Break down our upcoming multi-project BAC evaluation module into 4 phases."*
  - *"@agent-architect: Create an implementation plan to support PDF digital signing with PhilGEPS certificates."*
- **Active Skills**: `planning-and-task-breakdown`, `spec-driven-development`, `idea-refine`, `context-engineering`, `writing-plans`, `subagent-driven-development`.

---

### 2. 🎨 `@agent-designer` — UI/UX & Design Systems Lead
- **When to use**: Building or redesigning UI, improving styling, animations, cards, modals, or banners.
- **Example Prompts**:
  - *"@agent-designer: Make the Merged Package preview modal feel like a sleek, modern enterprise app."*
  - *"@agent-designer: Design a set of high-contrast status pills for Envelope 1 and Envelope 2 readiness."*
- **Active Skills**: `ui-ux-pro-max`, `design`, `design-system`, `brand`, `banner-design`, `slides`, `ui-styling`, `frontend-ui-engineering`.

---

### 3. ⚡ `@agent-pdf-engineer` — BiDOCS PDF & Gov Procurement Engine
- **When to use**: Modifying PDF generation, merging, multi-copy bundles, statutory forms, or pagination.
- **Example Prompts**:
  - *"@agent-pdf-engineer: Verify all 27 statutory forms compile properly in the 3-copy sealed package."*
  - *"@agent-pdf-engineer: Ensure the Table of Contents dynamically reflects total stamped page numbers."*
- **Active Skills**: `bidocs-pdf-system`, `api-and-interface-design`, `context7-mcp`.

---

### 4. 🗄️ `@agent-database` — Database & Supabase Specialist
- **When to use**: Database schemas, Supabase edge functions, Row Level Security (RLS), IndexedDB caching.
- **Example Prompts**:
  - *"@agent-database: Write a migration to add an audit_log table with tenant isolation RLS."*
  - *"@agent-database: Optimize IndexedDB binary caching for bid package documents."*
- **Active Skills**: `supabase`, `supabase-postgres-best-practices`, `vaultIndexedDB`.

---

### 5. 🧪 `@agent-qa` — QA & Browser Automation Engineer
- **When to use**: Writing automated tests, verifying browser behavior with DevTools, testing PDF downloads.
- **Example Prompts**:
  - *"@agent-qa: Write a Playwright test that uploads a document and verifies it appears in the merged package."*
  - *"@agent-qa: Run DevTools checks on our off-screen rendering container to ensure no layout shifts."*
- **Active Skills**: `playwright-skill`, `browser-testing-with-devtools`, `test-driven-development`, `verification-before-completion`, `verify-and-stop`.

---

### 6. 🛡️ `@agent-security` — Cybersecurity & Secret Guard
- **When to use**: Auditing code for secrets, handling API keys, hardening against vulnerabilities.
- **Example Prompts**:
  - *"@agent-security: Scan all recently added files and git history for accidentally committed API keys."*
  - *"@agent-security: Install pre-commit hooks to block sensitive credentials."*
- **Active Skills**: `scan-secrets`, `check-hmsl`, `install-hooks`, `scan-machine`, `create-honeytokens`, `triage-incidents`, `security-and-hardening`.

---

### 7. 🔬 `@agent-reviewer` — Code Reviewer & Standards Auditor
- **When to use**: Pre-PR reviews, code cleanup, reducing complexity, enforcing Qodo standards.
- **Example Prompts**:
  - *"@agent-reviewer: Review my git diff for potential regressions before I commit."*
  - *"@agent-reviewer: Simplify and refactor bidpackage.tsx helper functions without breaking behavior."*
- **Active Skills**: `code-review-and-quality`, `qodo-get-rules`, `qodo-pr-resolver`, `qodo-review`, `doubt-driven-development`, `code-simplification`, `receiving-code-review`, `requesting-code-review`.

---

### 8. 🚀 `@agent-devops` — DevOps & Release Commander
- **When to use**: Release preparation, git branching, CI/CD automation, telemetry.
- **Example Prompts**:
  - *"@agent-devops: Prepare the changelog and release notes for version 2.4.0."*
  - *"@agent-devops: Configure a GitHub Actions workflow to run tsc and playwright tests on pull requests."*
- **Active Skills**: `shipping-and-launch`, `ci-cd-and-automation`, `git-workflow-and-versioning`, `finishing-a-development-branch`, `observability-and-instrumentation`, `using-git-worktrees`.

---

### 9. 🦴 `@agent-token-optimizer` — Caveman Token Optimizer & Investigator
- **When to use**: When you want brief, ultra-dense responses to save tokens, or for surgical bug fixes.
- **Example Prompts**:
  - *"/caveman: Fix the button alignment on mobile screens."*
  - *"@agent-token-optimizer: Investigate why document date parser returns NaN on safari."*
- **Active Skills**: `caveman`, `caveman-commit`, `caveman-compress`, `caveman-stats`, `investigate-first`, `lean-build`, `surgical-patch`, `safe-refactor`.

---

### 10. 📑 `@agent-compliance` — Procurement Compliance & Documentation Officer
- **When to use**: Ensuring RA 12009 / RA 9184 compliance, writing Architecture Decision Records (ADRs).
- **Example Prompts**:
  - *"@agent-compliance: Audit our 27 bid package items against Republic Act 12009 (NGPA) standards."*
  - *"@agent-compliance: Write an ADR on why we use Legal Portrait instead of A4 for government bidding."*
- **Active Skills**: `documentation-and-adrs`, `interview-me`, `constraint-driven-development`.

---

### 11. 💻 `@agent-senior-fullstack` — Senior Full-Stack Developer
- **When to use**: End-to-end full-stack development, architectural refactors, React 19, TypeScript strict typing, Tailwind CSS styling, Vite build optimization, Supabase DB & Auth, IndexedDB local persistence.
- **Example Prompts**:
  - *"@agent-senior-fullstack: Refactor the opportunity finder and bid package flow with strict type safety and error boundaries."*
  - *"@agent-senior-fullstack: Optimize frontend rendering performance and bundle chunking."*
- **Active Skills**: `senior-fullstack-engineer`, `frontend-ui-engineering`, `api-and-interface-design`, `supabase`, `performance-optimization`, `safe-refactor`.

---

### 12. 🛡️ `@agent-cybersecurity` — Enterprise Cybersecurity Guardian
- **When to use**: Secret leakage scanning, vulnerability audits, input sanitization, OWASP Top 10 hardening, CSP policies, document tamper-evidence, and strict Row Level Security.
- **Example Prompts**:
  - *"@agent-cybersecurity: Audit our dependencies and git history for security vulnerabilities and leaked credentials."*
  - *"@agent-cybersecurity: Review the document QR code generator and verify tamper-proof hash integrity."*
- **Active Skills**: `cybersecurity-guardian`, `scan-secrets`, `check-hmsl`, `install-hooks`, `scan-machine`, `security-and-hardening`, `triage-incidents`.

---

### 13. 📄 `@agent-document-master` — Zero-Whitespace World-Class Document & PDF Master
- **When to use**: Professional, publication-ready PDF and document generation with 100% full-page utilization, zero dead whitespace gaps, exact Philippine Legal dimensions (8.5" x 13"), 3-copy sealed package stamping, and statutory RA 9184 / RA 12009 compliance.
- **Example Prompts**:
  - *"@agent-document-master: Eliminate awkward empty spaces in the Bill of Quantities PDF using dynamic auto-fit packing."*
  - *"@agent-document-master: Build an elite statutory bid document template with zero orphan rows and balanced page distribution."*
- **Active Skills**: `zero-whitespace-pdf-master`, `bidocs-pdf-system`, `autoFitEngine`, `api-and-interface-design`, `context7-mcp`.

---

## 💡 Pro Tip: Multi-Agent Collaboration
You can combine agents in a single prompt!
> *"@agent-architect plan the feature, @agent-designer design the layout, @agent-senior-fullstack implement the full-stack logic, and @agent-document-master guarantee zero whitespace in the final PDF export."*

The Master Orchestrator will automatically execute the phases in sequence!

