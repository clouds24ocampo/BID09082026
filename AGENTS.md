# BiDOCS Agent Instructions

Single source of truth for agent roles and non-negotiable rules. Other docs link here; do not copy rules elsewhere.

## Routing
Auto-route by intent. User never needs `@agent`. Handles are optional shortcuts for forcing a role (full list and example prompts: `.agent/AGENT-COMMANDS.md`). Multi-domain work runs: plan → design → implement → review+security → QA (`npx tsc --noEmit`, tests, evidence before "done").

## Roles (21) and core skills
Skills live in `.agents/skills/<name>/SKILL.md`. Load only the skill the task needs.

| Handle | Role | Core skills |
|:--|:--|:--|
| `@agent-architect` | Planner | `planning-and-task-breakdown`, `spec-driven-development`, `idea-refine`, `writing-plans` |
| `@agent-designer` | UI/UX | `ui-ux-pro-max`, `design`, `design-system`, `brand`, `ui-styling`, `banner-design`, `slides` |
| `@agent-pdf-engineer` | PDF + procurement forms | `bidocs-pdf-system`, `api-and-interface-design`, `context7-mcp` |
| `@agent-database` | Supabase / Postgres / IndexedDB | `supabase`, `supabase-postgres-best-practices`, `vault-local-storage` |
| `@agent-qa` | Tests / browser | `playwright-skill`, `browser-testing-with-devtools`, `test-driven-development`, `verify-and-stop` |
| `@agent-security` | Secrets | `scan-secrets`, `check-hmsl`, `install-hooks`, `security-and-hardening` |
| `@agent-cybersecurity` | Hardening audit | `cybersecurity-guardian`, `scan-secrets`, `security-and-hardening` |
| `@agent-reviewer` | Code review | `code-review-and-quality`, `qodo-get-rules`, `qodo-pr-resolver`, `doubt-driven-development` |
| `@agent-devops` | CI / release | `shipping-and-launch`, `ci-cd-and-automation`, `git-workflow-and-versioning` |
| `@agent-token-optimizer` | Terse + surgical fixes | `caveman`, `caveman-commit`, `investigate-first`, `surgical-patch` |
| `@agent-compliance` | ADRs / audit | `documentation-and-adrs`, `interview-me`, `constraint-driven-development` |
| `@agent-senior-fullstack` | Feature work | `senior-fullstack-engineer`, `frontend-ui-engineering`, `performance-optimization` |
| `@agent-expert-fullstack` | Crash-proof features | `expert-fullstack-developer`, `senior-fullstack-engineer`, `vault-local-storage` |
| `@agent-document-master` | Zero-whitespace layout | `zero-whitespace-pdf-master`, `bidocs-pdf-system` |
| `@agent-performance-engineer` | Perf / bundle | `performance-optimization-master`, `safe-refactor` |
| `@agent-api-architect` | Data contracts | `api-data-architect`, `api-and-interface-design` |
| `@agent-system-debugger` | Root-cause debugging | `system-diagnostics-debugger`, `systematic-debugging` |
| `@agent-procurement-specialist` | RA 9184 / RA 12009 | `philippine-procurement-statutory`, `bid-package-management` |
| `@agent-vault-storage` | Local-first storage | `vault-local-storage`, `performance-optimization` |
| `@agent-bid-manager` | Bid dossier | `bid-package-management`, `philippine-procurement-statutory`, `api-data-architect` |
| `@agent-bidocs-pdf-guard` | PDF rule enforcer | `bidocs-pdf-guard`, `zero-whitespace-pdf-master`, `bidocs-pdf-system` |

Definitions: `.agents/agents/` (10 core), `.github/agents/*.agent.md` (23 Copilot-format). Add a role = add one file there plus one row here.

## Non-Negotiable Rules
- **PDF-1**: `buildMergedThreeLayerPdfDataUrl` returns base64 via `blobToDataUrl`. No `URL.createObjectURL` in that path. Allowed only in `buildMergedThreeLayerPdfBlobUrl` and `exportMergedThreeLayerPdf` (download, revoked).
- **PDF-2**: Module-scope `LEGAL_PORTRAIT` [612, 936], `LEGAL_LANDSCAPE` [936, 612]. Legal only, never A4/Letter.
- **PDF-3**: No pre-jumping the progress bar; engine `onProgress` drives it.
- **PDF-4**: Off-screen containers: `style={{ left: '-9999px', top: '0px', width: '816px', zIndex: -1 }}`.
- **PDF-5**: Cover elements use ids `bundle-cover-${doc.id}`, `preview-cover-${folderCopy}-${doc.id}`.
- **PDF-6**: Never remove `blobToDataUrl` from `src/utils/pdfExportEngine.ts`.
- **PDF-7**: Tables use `autoFitEngine` (`calculateRowHeight`, `autoFitPageChunks`): full pages, no orphan rows. See `zero-whitespace-pdf-master`.
- **T-1**: Run `npx tsc --noEmit` before and after code changes. `npm run validate` = tsc + PDF guard.

Details: `ARCHITECTURE.md`, `GEMINI.md`, `DEBUGGING.md`, `.agents/skills/bidocs-pdf-system/SKILL.md`.
