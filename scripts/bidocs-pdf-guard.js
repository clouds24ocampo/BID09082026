#!/usr/bin/env node
/**
 * BiDOCS PDF Guard — Standalone Validation Script
 *
 * Checks the 5 critical PDF system rules by scanning source files directly.
 * Does NOT need ESLint or a TypeScript parser — runs on Node.js only.
 * Called by: npm run lint:pdf  AND  .husky/pre-commit
 *
 * Rules enforced:
 *   PDF-1: buildMergedThreeLayerPdfDataUrl must NOT use URL.createObjectURL
 *   PDF-2: No inner-scope redeclaration of [936, 612] or [612, 936] arrays
 *   PDF-3: No setCompileProgress pre-jump before buildMergedThreeLayerPdfDataUrl
 *   PDF-4: Off-screen containers must use left:-9999px, not overflow:hidden
 *   PDF-5: Cover elements must use getElementById, not querySelectorAll('.print-document-sheet')
 *   PDF-6: blobToDataUrl helper must exist in pdfExportEngine.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let errorCount = 0;
let passCount  = 0;

function readFile(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

function fail(rule, file, message, lineNum = null) {
  errorCount++;
  const loc = lineNum ? `${file}:${lineNum}` : file;
  console.error(`${RED}✗ [${rule}]${RESET} ${BOLD}${loc}${RESET}`);
  console.error(`  ${RED}${message}${RESET}`);
  console.error();
}

function pass(rule, message) {
  passCount++;
  console.log(`${GREEN}✓ [${rule}]${RESET} ${message}`);
}

function checkLines(content, file, pattern, rule, errorMsg) {
  const lines = content.split('\n');
  let found = false;
  lines.forEach((line, i) => {
    if (pattern.test(line)) {
      found = true;
      fail(rule, file, `${errorMsg}\n  Found: ${line.trim()}`, i + 1);
    }
  });
  return found;
}

console.log();
console.log(`${BOLD}╔════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${BOLD}║  BiDOCS PDF Guard — Checking 5 critical rules...       ║${RESET}`);
console.log(`${BOLD}╚════════════════════════════════════════════════════════╝${RESET}`);
console.log();

// ── PDF-1: buildMergedThreeLayerPdfDataUrl must return base64, not blob URL ──
const engineFile = 'src/utils/pdfExportEngine.ts';
const engineSrc = readFile(engineFile);

if (!engineSrc) {
  fail('PDF-1', engineFile, 'pdfExportEngine.ts is MISSING. Do not delete this file.');
} else {
  // Find the function and check if it contains createObjectURL inside it
  const fnMatch = engineSrc.match(
    /async function buildMergedThreeLayerPdfDataUrl[\s\S]*?^}/m
  );
  
  // Simpler: scan lines between the function declaration and the next export function
  const lines = engineSrc.split('\n');
  let insideFn = false;
  let braceDepth = 0;
  let violations = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('async function buildMergedThreeLayerPdfDataUrl')) {
      insideFn = true;
      braceDepth = 0;
    }
    if (insideFn) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (line.includes('URL.createObjectURL')) {
        violations.push({ line: i + 1, text: line.trim() });
      }
      if (braceDepth < 0 || (braceDepth === 0 && i > 0 && line.trim() === '}')) {
        insideFn = false;
      }
    }
  }
  
  if (violations.length > 0) {
    violations.forEach(v => fail('PDF-1', engineFile,
      `buildMergedThreeLayerPdfDataUrl uses URL.createObjectURL — this causes blank PDF iframes.\n  Use blobToDataUrl(blob) instead.\n  Found: ${v.text}`,
      v.line));
  } else {
    pass('PDF-1', 'buildMergedThreeLayerPdfDataUrl does NOT use URL.createObjectURL ✓');
  }

  // Check blobToDataUrl exists (PDF-6)
  if (!engineSrc.includes('const blobToDataUrl') && !engineSrc.includes('function blobToDataUrl')) {
    fail('PDF-6', engineFile,
      'blobToDataUrl helper is MISSING from pdfExportEngine.ts. This function is required for stable PDF iframe embedding.');
  } else {
    pass('PDF-6', 'blobToDataUrl helper exists in pdfExportEngine.ts ✓');
  }

  // Check LEGAL_LANDSCAPE / LEGAL_PORTRAIT are module-scope (PDF-2)
  // Look for [936, 612] or [612, 936] inside function bodies (not at top level)
  const fnBodyPattern = /(?:function|=>)\s*\{[\s\S]*?\[(?:936\s*,\s*612|612\s*,\s*936)\][\s\S]*?\}/g;
  const moduleLines = engineSrc.split('\n');
  let innerDeclViolations = [];
  let scopeDepth = 0;
  let inModuleScope = true;
  
  for (let i = 0; i < moduleLines.length; i++) {
    const line = moduleLines[i];
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    scopeDepth += openBraces - closeBraces;
    
    // At scope depth > 1 we're inside a function
    if (scopeDepth > 1) {
      if (
        /\[\s*936\s*,\s*612\s*\]/.test(line) ||
        /\[\s*612\s*,\s*936\s*\]/.test(line)
      ) {
        // Only flag if it's a variable declaration (not an array access or return)
        if (/const|let|var/.test(line)) {
          innerDeclViolations.push({ line: i + 1, text: line.trim() });
        }
      }
    }
  }
  
  if (innerDeclViolations.length > 0) {
    innerDeclViolations.forEach(v => fail('PDF-2', engineFile,
      `Legal dimensions redeclared inside function (use LEGAL_LANDSCAPE/LEGAL_PORTRAIT module constants).\n  Found: ${v.text}`,
      v.line));
  } else {
    pass('PDF-2', 'No inner-scope legal dimension redeclarations found ✓');
  }
}

// ── PDF-3: No progress pre-jump in MergedPackageViewerModal ─────────────────
const mergedModalFile = 'src/components/vault/MergedPackageViewerModal.tsx';
const mergedModalSrc = readFile(mergedModalFile);

if (!mergedModalSrc) {
  fail('PDF-3', mergedModalFile, 'MergedPackageViewerModal.tsx is MISSING.');
} else {
  // Look for setCompileProgress called within 8 lines before buildMergedThreeLayerPdfDataUrl
  const lines = mergedModalSrc.split('\n');
  let lastProgressLine = -1;
  let violations = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/setCompileProgress\s*\(/.test(line) && !line.includes('onProgress') && !line.includes('progress =>') && !line.includes('(progress)')) {
      lastProgressLine = i;
    }
    if (line.includes('buildMergedThreeLayerPdfDataUrl') && lastProgressLine > 0) {
      const gap = i - lastProgressLine;
      if (gap <= 8) {
        violations.push({ line: i + 1, prevLine: lastProgressLine + 1, gap });
      }
    }
  }
  
  if (violations.length > 0) {
    violations.forEach(v => fail('PDF-3', mergedModalFile,
      `setCompileProgress() called ${v.gap} lines before buildMergedThreeLayerPdfDataUrl (line ${v.prevLine}).\n  This causes the progress bar to jump backward. Remove the manual setCompileProgress call.\n  Let the engine's onProgress callback drive the bar.`,
      v.line));
  } else {
    pass('PDF-3', 'No premature progress bar pre-jumps found ✓');
  }

  // PDF-4: Check off-screen container uses left:-9999px, not overflow:hidden + left:0
  const hasOverflowHiddenWithLeft0 = /style=\{[^}]*overflow[^}]*hidden[^}]*\}/.test(mergedModalSrc) &&
    /style=\{[^}]*left[^}]*0[^}]*overflow[^}]*hidden[^}]*\}/.test(mergedModalSrc);
  
  // Simpler: look for the off-screen container comment + overflow:hidden pattern
  if (mergedModalSrc.includes('OFF-SCREEN') && /overflow.*hidden/.test(mergedModalSrc)) {
    // Check if it's combined with height:0 (the bad pattern)
    if (/height.*0.*overflow.*hidden|overflow.*hidden.*height.*0/.test(mergedModalSrc)) {
      fail('PDF-4', mergedModalFile,
        'Off-screen container uses overflow:hidden which clips html2canvas capture.\n  Use style={{ left: \'-9999px\', top: \'0px\', width: \'816px\', zIndex: -1 }} instead.');
    } else {
      pass('PDF-4', 'Off-screen container does not clip html2canvas elements ✓');
    }
  } else {
    pass('PDF-4', 'Off-screen container positioning OK ✓');
  }
}

// ── PDF-5: No broad querySelectorAll('.print-document-sheet') ────────────────
const mergedViewerFile = 'src/components/vault/MergedPdfViewerModal.tsx';
const mergedViewerSrc = readFile(mergedViewerFile);

if (!mergedViewerSrc) {
  fail('PDF-5', mergedViewerFile, 'MergedPdfViewerModal.tsx is MISSING.');
} else {
  const lines = mergedViewerSrc.split('\n');
  let violations = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('querySelectorAll') && line.includes('print-document-sheet')) {
      violations.push({ line: i + 1, text: line.trim() });
    }
  }
  
  if (violations.length > 0) {
    violations.forEach(v => fail('PDF-5', mergedViewerFile,
      `querySelectorAll('.print-document-sheet') is too broad — it grabs cover pages from ALL open modals.\n  Use document.getElementById('bundle-cover-' + doc.id) for specific lookup.\n  Found: ${v.text}`,
      v.line));
  } else {
    pass('PDF-5', 'No broad .print-document-sheet querySelectorAll found ✓');
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log();
console.log(`${'─'.repeat(56)}`);
if (errorCount === 0) {
  console.log(`${GREEN}${BOLD}All ${passCount} PDF system rules passed! ✓${RESET}`);
  console.log();
  process.exit(0);
} else {
  console.log(`${RED}${BOLD}FAILED: ${errorCount} rule violation(s) detected.${RESET}`);
  console.log(`${YELLOW}Read GEMINI.md or .agents/skills/bidocs-pdf-system/SKILL.md for the rules.${RESET}`);
  console.log();
  process.exit(1);
}
