/**
 * ESLint Plugin: bidocs-pdf
 *
 * Custom lint rules that enforce the BiDOCS PDF System stability rules.
 * These rules directly encode the bugs that were fixed in September 2026
 * so they can NEVER be accidentally reintroduced by any developer or AI agent.
 *
 * Rules:
 *  - no-blob-url-in-data-url-fn         (PDF-1) Prevents blank iframes on re-render
 *  - no-inner-legal-dimension-redeclaration (PDF-2) Prevents dead duplicate constants
 *  - no-progress-pre-jump               (PDF-3) Prevents broken progress bar
 *  - no-broad-print-sheet-queryselector (PDF-5) Prevents wrong element capture
 *  - no-overflow-hidden-offscreen-container (PDF-4) Prevents html2canvas clip
 */

// ── Rule 1: buildMergedThreeLayerPdfDataUrl must NOT return createObjectURL ──
const noBlobUrlInDataUrlFn = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'buildMergedThreeLayerPdfDataUrl must return a base64 data URL via blobToDataUrl(), not a Blob URL via URL.createObjectURL(). Blob URLs cause blank PDF iframes after React re-renders.',
      category: 'BiDOCS PDF System',
      recommended: true,
      url: 'https://github.com/bidocs/.agents/skills/bidocs-pdf-system/SKILL.md#bug-1',
    },
    messages: {
      noBlobUrl:
        '[BiDOCS PDF-1] buildMergedThreeLayerPdfDataUrl must return blobToDataUrl(blob), NOT URL.createObjectURL(blob). ' +
        'Blob URLs get garbage-collected causing blank PDF iframes on re-render. ' +
        'Fix: return await blobToDataUrl(blob);',
    },
    schema: [],
  },
  create(context) {
    let insidePdfDataUrlFn = false;
    let fnDepth = 0;

    return {
      FunctionDeclaration(node) {
        if (node.id && node.id.name === 'buildMergedThreeLayerPdfDataUrl') {
          insidePdfDataUrlFn = true;
          fnDepth = 0;
        } else if (insidePdfDataUrlFn) {
          fnDepth++;
        }
      },
      'FunctionDeclaration:exit'(node) {
        if (node.id && node.id.name === 'buildMergedThreeLayerPdfDataUrl') {
          insidePdfDataUrlFn = false;
        } else if (insidePdfDataUrlFn) {
          fnDepth--;
        }
      },
      CallExpression(node) {
        if (!insidePdfDataUrlFn || fnDepth > 0) return;
        // Detect: URL.createObjectURL(...)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'URL' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'createObjectURL'
        ) {
          context.report({ node, messageId: 'noBlobUrl' });
        }
      },
    };
  },
};

// ── Rule 2: No redeclaring legal dimensions inside functions ──────────────────
const noInnerLegalDimensionRedeclaration = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'LEGAL_LANDSCAPE [936, 612] and LEGAL_PORTRAIT [612, 936] must only be declared at module scope in pdfExportEngine.ts. Inner-scope redeclarations are dead code.',
      category: 'BiDOCS PDF System',
      recommended: true,
    },
    messages: {
      noDuplicate:
        '[BiDOCS PDF-2] Do not redeclare legal paper dimensions [936, 612] or [612, 936] inside a function body. ' +
        'Use the module-scope constants LEGAL_LANDSCAPE or LEGAL_PORTRAIT instead.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename ? context.getFilename() : context.filename;
    // Only enforce in pdfExportEngine.ts
    if (!filename.includes('pdfExportEngine')) return {};

    let scopeDepth = 0;

    return {
      FunctionDeclaration() { scopeDepth++; },
      'FunctionDeclaration:exit'() { scopeDepth--; },
      ArrowFunctionExpression() { scopeDepth++; },
      'ArrowFunctionExpression:exit'() { scopeDepth--; },
      VariableDeclaration(node) {
        if (scopeDepth === 0) return; // module scope is fine
        for (const decl of node.declarations) {
          if (!decl.init || decl.init.type !== 'ArrayExpression') continue;
          const elements = decl.init.elements;
          if (elements.length === 2) {
            const vals = elements.map(e => e && e.type === 'Literal' ? e.value : null);
            if (
              (vals[0] === 936 && vals[1] === 612) ||
              (vals[0] === 612 && vals[1] === 936)
            ) {
              context.report({ node: decl, messageId: 'noDuplicate' });
            }
          }
        }
      },
    };
  },
};

// ── Rule 3: No pre-jumping progress bar before merge call ────────────────────
const noProgressPreJump = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Never call setCompileProgress with a high percent value before calling buildMergedThreeLayerPdfDataUrl. ' +
        'The engine\'s onProgress callback drives the bar. Pre-jumping causes it to jump backward.',
      category: 'BiDOCS PDF System',
      recommended: true,
    },
    messages: {
      noPreJump:
        '[BiDOCS PDF-3] Do not manually call setCompileProgress() before buildMergedThreeLayerPdfDataUrl(). ' +
        'Let the engine\'s onProgress callback drive the progress bar smoothly from 0% to 100%.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename ? context.getFilename() : context.filename;
    if (!filename.includes('MergedPackageViewerModal')) return {};

    let lastSetProgressLine = -1;
    let hasSeenBuildCall = false;

    return {
      CallExpression(node) {
        const name =
          node.callee.type === 'Identifier' ? node.callee.name :
          node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier'
            ? node.callee.property.name
            : null;

        if (name === 'setCompileProgress') {
          lastSetProgressLine = node.loc ? node.loc.start.line : -1;
          hasSeenBuildCall = false;
        }

        if (
          name === 'buildMergedThreeLayerPdfDataUrl' &&
          lastSetProgressLine > 0 &&
          !hasSeenBuildCall
        ) {
          hasSeenBuildCall = true;
          // Only report if setCompileProgress was called within 10 lines before
          const buildLine = node.loc ? node.loc.start.line : -1;
          if (buildLine > 0 && buildLine - lastSetProgressLine < 10) {
            // Check the setCompileProgress arg has percent >= 50 (a pre-jump)
            // We'll flag any setCompileProgress call within 10 lines before the build call
            context.report({ node, messageId: 'noPreJump' });
          }
        }
      },
    };
  },
};

// ── Rule 4: No querySelectorAll for .print-document-sheet ────────────────────
const noBroadPrintSheetQuerySelector = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Never use document.querySelectorAll(\'.print-document-sheet\') to find cover page elements. ' +
        'This is too broad and grabs elements from other open modals. ' +
        'Use document.getElementById(\'bundle-cover-\' + doc.id) instead.',
      category: 'BiDOCS PDF System',
      recommended: true,
    },
    messages: {
      noBroadSelector:
        '[BiDOCS PDF-5] Do not use querySelectorAll(\'.print-document-sheet\'). ' +
        'This grabs cover pages from ALL open modals on the page. ' +
        'Use document.getElementById(\'bundle-cover-\' + doc.id) for specific element lookup.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        // Detect: document.querySelectorAll('.print-document-sheet')
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'document' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'querySelectorAll' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          node.arguments[0].value.includes('print-document-sheet')
        ) {
          context.report({ node, messageId: 'noBroadSelector' });
        }
      },
    };
  },
};

// ── Rule 5: No overflow:hidden on off-screen render containers ───────────────
const noOverflowHiddenOffscreenContainer = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Off-screen render containers used for html2canvas capture must NOT use overflow:hidden. ' +
        'overflow:hidden clips elements and breaks html2canvas. Use left:-9999px instead.',
      category: 'BiDOCS PDF System',
      recommended: true,
    },
    messages: {
      noOverflowHidden:
        '[BiDOCS PDF-4] Do not use overflow:hidden on off-screen render containers. ' +
        'html2canvas cannot capture clipped elements. ' +
        'Use style={{ left: \'-9999px\', top: \'0px\', width: \'816px\', zIndex: -1 }} instead.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename ? context.getFilename() : context.filename;
    if (
      !filename.includes('MergedPackageViewerModal') &&
      !filename.includes('MergedPdfViewerModal')
    ) return {};

    return {
      // Detect JSX: style={{ ..., overflow: 'hidden', ... }} on a div with zIndex: -9999 or left: 0
      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'style') return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        if (expr.type !== 'ObjectExpression') return;

        let hasOverflowHidden = false;
        let hasZIndexNegative = false;
        let hasLeft0 = false;

        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue;
          const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
          const val = prop.value.type === 'Literal' ? prop.value.value : null;

          if (key === 'overflow' && val === 'hidden') hasOverflowHidden = true;
          if (key === 'zIndex' && (val === -9999 || val === '-9999')) hasZIndexNegative = true;
          if (key === 'left' && (val === 0 || val === '0' || val === '0px')) hasLeft0 = true;
        }

        if (hasOverflowHidden && (hasZIndexNegative || hasLeft0)) {
          context.report({ node, messageId: 'noOverflowHidden' });
        }
      },
    };
  },
};

// ── Plugin Export ─────────────────────────────────────────────────────────────
export default {
  meta: {
    name: 'eslint-plugin-bidocs-pdf',
    version: '1.0.0',
  },
  rules: {
    'no-blob-url-in-data-url-fn': noBlobUrlInDataUrlFn,
    'no-inner-legal-dimension-redeclaration': noInnerLegalDimensionRedeclaration,
    'no-progress-pre-jump': noProgressPreJump,
    'no-broad-print-sheet-queryselector': noBroadPrintSheetQuerySelector,
    'no-overflow-hidden-offscreen-container': noOverflowHiddenOffscreenContainer,
  },
};
