# BiDOCS

Philippine public bidding management system for **RA 9184** and **RA 12009 (NGPA)**.
Generate statutory procurement forms, keep an eligibility document vault, and export
QR-verified, 3-copy sealed bid packages (ORIGINAL, COPY 1, COPY 2) on Legal paper.

One React codebase ships as a **web app / PWA**, a **desktop app** (Electron) and a **mobile app** (Capacitor, Android).

> Local-first: business data lives in the user's browser or device storage (IndexedDB and localStorage).
> The optional Express server only serves the built files and a health endpoint.

## Contents

- [Quick start](#quick-start)
- [Platforms](#platforms)
- [Scripts](#scripts)
- [Quality gates](#quality-gates)
- [PDF engine rules](#pdf-engine-rules)
- [Project layout](#project-layout)
- [Release process](#release-process)
- [Further reading](#further-reading)

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
npm run dev            # http://localhost:3001 (next free port if 3001 is taken)
```

Production build, served by the bundled Express server:

```bash
npm run build
npm start              # http://localhost:3000 (falls back to the next free port)
```

## Platforms

| Platform | How | Output |
|:--|:--|:--|
| Web / PWA | `npm run build` and host `dist/` (Netlify config included). Installable, works offline after first load. | `dist/` |
| Desktop (Windows, macOS, Linux) | `npm run desktop:dev` to develop, `npm run desktop:build` to package. | `release/` |
| Android | `npm run android:open` opens Android Studio, or `npm run android:run` on a device. | `android/` |
| iOS | `npx cap add ios` on a Mac with Xcode, then `npx cap open ios`. | `ios/` |

The Android project is committed in `android/`. Building an APK locally needs JDK 21 and the Android SDK.
Without them, push a tag and let CI build it (see [Release process](#release-process)).

All platforms use the same build (`vite.config.ts` sets a relative `base`) so behaviour is identical.
Icons for every platform come from one source: `npm run icons` regenerates them from `scripts/generate-icons.mjs`.

### Desktop shell security

Context isolation on, Node integration off, sandboxed renderer, navigation locked to the app,
external links open in the system browser, all device permission prompts denied.

## Scripts

| Script | Purpose |
|:--|:--|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then production build |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint on the JavaScript entry points |
| `npm run lint:pdf` | PDF system rule guard (PDF-1 to PDF-6) |
| `npm run validate` | Typecheck and PDF guard (also the pre-commit hook) |
| `npm run desktop:dev` / `desktop:build` | Desktop shell, develop / package |
| `npm run mobile:sync` | Build and copy the web app into the native projects |

## Quality gates

- Husky pre-commit: `tsc --noEmit` and the PDF guard.
- CI (`.github/workflows/ci.yml`): typecheck, PDF guard, tests, build, `npm audit --omit=dev --audit-level=high`.
- Tests include **blank-page** and **whitespace** checks that render every generated PDF and fail when a
  page is empty or contains a large unused band (`src/utils/__tests__/noBlankPages.test.ts`, `pdfWhitespace.test.ts`).

## PDF engine rules

Non-negotiable rules are enforced by `scripts/bidocs-pdf-guard.js` and documented in [AGENTS.md](AGENTS.md):
Legal paper only, base64 data URLs for merged output, engine-driven progress, fixed off-screen container styles.

Generated forms (`src/utils/systemDocumentPdfGenerator.ts`) are laid out so each page is used fully:

- Prose forms (sworn statements, declarations, certificates) word-wrap completely and auto-size to the page.
- Table forms add numbered fill-in rows down to the signatory footer.
- `src/utils/pdfPageFill.ts` stretches any remaining body space between header and footer.

## Project layout

```text
src/
  components/    UI by feature (auth, vault, bids, forms, covers, landing, layout ...)
  context/       AuthContext (accounts, sessions, roles)
  utils/         PDF engine, form generators, storage, classification, tests
electron/        Desktop shell (main process and preload)
android/         Capacitor Android project
public/          Manifest, service worker, icons
scripts/         Icon generation, desktop launcher, PDF guard, e2e checks
server.js        Static server and /api/health
```

## Release process

1. Make sure `npm run validate && npm test` pass.
2. Tag and push: `git tag v1.0.0 && git push origin v1.0.0`.
3. `.github/workflows/release.yml` builds Windows/macOS/Linux installers and an Android debug APK,
   then attaches them to the GitHub Release.

Signed store builds (Play Store, App Store, code-signed installers) need your own signing keys added as repository secrets.

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md): layers, storage, PDF pipeline
- [DEBUGGING.md](DEBUGGING.md): troubleshooting notes
- [AGENTS.md](AGENTS.md): agent roles and the non-negotiable PDF rules
