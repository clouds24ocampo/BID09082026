# BiDOCS Multi-Agent System (Antigravity Orchestrator)

Welcome to the **BiDOCS Agent Swarm**, powered by Google Antigravity and 79 specialized engineering skills + Context7 live MCP integration.

---

## 🎯 How to Invoke Specialized Agents

You can invoke or instruct any specialized agent directly in your prompt, or let the Master Orchestrator route it automatically:

| Agent Handle | Specialization | Core Skills | Typical Commands |
|:---|:---|:---|:---|
| `@agent-architect` | **System Architect & Planner** | `planning-and-task-breakdown`, `spec-driven-development`, `idea-refine`, `writing-plans` | "Plan the new feature X", "Decompose this project into phases" |
| `@agent-designer` | **UI/UX & Design Systems Lead** | `ui-ux-pro-max`, `design`, `design-system`, `brand`, `ui-styling`, `banner-design`, `slides` | "Make this modal look premium", "Design the procurement dashboard" |
| `@agent-pdf-engineer` | **BiDOCS PDF & Gov Procurement** | `bidocs-pdf-system`, `api-and-interface-design`, `context7-mcp` | "Fix the 3-copy sealed package", "Add statutory Form X", "Update page stamping" |
| `@agent-database` | **Database & Supabase Engineer** | `supabase`, `supabase-postgres-best-practices`, `vaultIndexedDB` | "Add an index to documents table", "Create RLS policy for tenant isolation" |
| `@agent-qa` | **QA & Browser Automation Engineer** | `playwright-skill`, `browser-testing-with-devtools`, `test-driven-development`, `verify-and-stop` | "Run Playwright test on merge flow", "Verify the off-screen canvas in DevTools" |
| `@agent-security` | **Security & Secret Guard** | `scan-secrets`, `check-hmsl`, `install-hooks`, `security-and-hardening` | "Scan the repo for leaked tokens", "Set up pre-commit hook" |
| `@agent-reviewer` | **Code Review & Standards Auditor** | `code-review-and-quality`, `qodo-get-rules`, `qodo-pr-resolver`, `doubt-driven-development` | "Review my uncommitted diff", "Simplify this complex function" |
| `@agent-devops` | **DevOps & Release Commander** | `shipping-and-launch`, `ci-cd-and-automation`, `git-workflow-and-versioning` | "Prepare release v2.1.0", "Set up GitHub Actions CI" |
| `@agent-token-optimizer` | **Caveman Token Optimizer** | `caveman`, `caveman-commit`, `caveman-compress`, `investigate-first`, `surgical-patch` | "/caveman", "Fix this bug with minimal tokens", "Investigate before editing" |
| `@agent-compliance` | **Procurement Compliance Officer** | `documentation-and-adrs`, `interview-me`, `constraint-driven-development` | "Write ADR for PDF engine", "Audit PhilGEPS BAC requirements" |

---

## 🏛️ Autonomous Delegation Protocol

When a request spans multiple disciplines, the agent operates in an autonomous pipeline:

1. **Phase 1 — Discovery & Planning** (`@agent-architect`):
   - Clarifies ambiguities and scopes the work without making premature edits (`investigate-first`).
   - Produces an execution plan with testable gates.

2. **Phase 2 — UI/UX Specification** (`@agent-designer`):
   - Validates color harmonies, typography, component hierarchies, and interactive states.

3. **Phase 3 — Implementation** (`@agent-pdf-engineer` / `@agent-database`):
   - Executes changes incrementally.
   - For PDF operations: Strictly enforces Legal paper dimensions (8.5" x 13"), base64 data URLs, and dedicated ID selectors.
   - For Database operations: Strictly enforces multi-tenant RLS isolation.

4. **Phase 4 — Code Audit & Security Check** (`@agent-reviewer` & `@agent-security`):
   - Audits changes against repo standards (`qodo-get-rules`).
   - Scans modified files for unintended secrets or tokens (`scan-secrets`).

5. **Phase 5 — QA Verification & Sign-off** (`@agent-qa`):
   - Runs `npx tsc --noEmit` to verify type safety.
   - Verifies rendering and outputs evidence before declaring complete (`verification-before-completion`).

---

## ⚡ Non-Negotiable System Rules
- **Rule PDF-1**: `buildMergedThreeLayerPdfDataUrl` must return base64 Data URLs via `blobToDataUrl`. Never use `URL.createObjectURL`.
- **Rule PDF-2**: Use top-level constants `LEGAL_PORTRAIT` [612, 936] and `LEGAL_LANDSCAPE` [936, 612].
- **Rule PDF-3**: No pre-jumping the progress bar.
- **Rule PDF-4**: Off-screen render containers must use `style={{ left: '-9999px', top: '0px', width: '816px', zIndex: -1 }}`.
- **Rule PDF-5**: Cover page elements must use dedicated IDs (`bundle-cover-${doc.id}`, `preview-cover-${folderCopy}-${doc.id}`).
- **Rule PDF-6**: Never remove `blobToDataUrl` helper in `src/utils/pdfExportEngine.ts`.
- **Rule T-1**: Always run `npx tsc --noEmit` before and after making code changes.
