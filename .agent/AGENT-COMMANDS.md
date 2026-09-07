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

## 💡 Pro Tip: Multi-Agent Collaboration
You can combine agents in a single prompt!
> *"@agent-architect plan the feature, @agent-designer design the layout, and @agent-pdf-engineer implement the PDF export."*

The Master Orchestrator will automatically execute the phases in sequence!
