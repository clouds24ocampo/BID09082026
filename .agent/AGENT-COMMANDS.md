# BiDOCS Agent Quick Reference

Roles, skills and rules: `AGENTS.md` (source of truth). This file = how to call them.

## Use
Just describe the task; the orchestrator picks the role. To force one, prefix the handle. Combine freely:
> `@agent-architect` plan it, `@agent-designer` layout, `@agent-expert-fullstack` build, `@agent-bidocs-pdf-guard` verify PDFs.

## Handles (21) and example prompt
| Handle | Example |
|:--|:--|
| `@agent-architect` | Break the BAC evaluation module into 4 phases |
| `@agent-designer` | Make the merged package preview modal look enterprise-grade |
| `@agent-pdf-engineer` | Verify all 27 statutory forms compile in the 3-copy package |
| `@agent-database` | Migration for `audit_log` with tenant RLS |
| `@agent-qa` | Playwright test: upload doc, see it in merged package |
| `@agent-security` | Scan history for committed keys; install pre-commit hook |
| `@agent-cybersecurity` | Audit `server.js` CORS, uploads, QR verify |
| `@agent-reviewer` | Review my diff for regressions |
| `@agent-devops` | Release notes for 2.4.0; CI for tsc + tests |
| `@agent-token-optimizer` | `/caveman` fix mobile button alignment |
| `@agent-compliance` | ADR: why Legal paper, not A4 |
| `@agent-senior-fullstack` | Refactor opportunity finder with strict types |
| `@agent-expert-fullstack` | Fault-tolerant multi-tab dashboard |
| `@agent-document-master` | Remove empty gaps in BOQ PDF via autofit |
| `@agent-performance-engineer` | Profile `dist/assets`, fix chunk splitting |
| `@agent-api-architect` | Type contract for PhilGEPS notice ingestion |
| `@agent-system-debugger` | Root cause of iframe unmount on tab switch |
| `@agent-procurement-specialist` | Audit checklist vs RA 12009; verify NFCC |
| `@agent-vault-storage` | Verify Project A data never shows in Project B |
| `@agent-bid-manager` | Assemble 3-envelope dossier for a PhilGEPS ref |
| `@agent-bidocs-pdf-guard` | Run guard; confirm no `createObjectURL` regressions |

## Commands
```
npx tsc --noEmit            # type check (Rule T-1)
npm test                    # vitest
npm run validate            # tsc + PDF guard
npm run lint:pdf            # PDF guard only
```

## Install / extend
- Skills: `npx -y skills add <owner/repo> -g` (full list: `.agent/skills-and-plugins-final.md`). Context7: `npx -y ctx7 setup`.
- New skill: `.agents/skills/<name>/SKILL.md` with `name` + `description` frontmatter, body under ~40 lines (use `writing-skills`).
- New agent: add `.agents/agents/NN-name.md` or `.github/agents/name.agent.md`, then one row in `AGENTS.md`.
- Editor extensions: `.vscode/extensions.json`.
