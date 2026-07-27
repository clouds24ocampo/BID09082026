---
name: git-manager
description: Manage Git version control workflows, repository initialization, staging, commits, branch management, stashing, merging, log inspections, and remote origin setup for Senior Lead Developers.
---

# Senior Git Workflow & Version Control Manager Skill

This skill provides comprehensive Git version control management, repository health enforcement, and structured commit workflows.

---

## 1. Core Git Workflows

### 🚀 **Repository Initialization & Status**
- **Initialize Repository**: `git init -b main`
- **Check Working Tree**: `git status`
- **Inspect Commit History**: `git log --oneline -n 10`

### 📦 **Staging & Commit Standards**
- **Stage All Changes**: `git add .`
- **Stage Specific File**: `git add <filepath>`
- **Structured Conventional Commits**:
  - `feat: <description>` — New feature or capability added
  - `fix: <description>` — Bug fix or error resolution
  - `style: <description>` — CSS / Layout / Aesthetic enhancement
  - `docs: <description>` — Documentation or skill updates
  - `refactor: <description>` — Code cleanup without behavior changes

Example:
```bash
git commit -m "feat: add legal document printing and PDF layout export engine"
```

---

## 2. Branching & Merging Strategy

- **Create Feature Branch**: `git checkout -b feature/<feature-name>`
- **Switch Branch**: `git checkout <branch-name>`
- **Merge Branch**: `git merge <feature-name>`
- **Delete Local Branch**: `git branch -d <branch-name>`

---

## 3. Advanced Utilities (Stash, Reset, Remotes)

- **Stash Uncommitted Work**: `git stash save "<description>"`
- **List & Apply Stash**: `git stash list` / `git stash pop`
- **Add Remote Origin**: `git remote add origin <repository-url>`
- **Push to Remote**: `git push -u origin main`

---

## 4. Git Guardrails for AI Assistant

1. **Verify `.gitignore`**: Always ensure `.gitignore` excludes `node_modules`, `dist`, `.env`, and build logs before staging.
2. **Never Commit Secret Keys**: Verify no API keys, credentials, or private secrets exist in staged code before calling `git commit`.
3. **Clean Commit Messages**: Use clear, professional conventional commit messages.
    