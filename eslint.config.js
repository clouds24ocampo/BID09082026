import js from '@eslint/js';

// TypeScript sources are verified by `tsc --noEmit` (TypeScript 7), which typescript-eslint does not
// support yet. ESLint therefore covers the JavaScript entry points: server, scripts and the desktop shell.
const node = {
  process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly', setTimeout: 'readonly',
  clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', __dirname: 'readonly',
  require: 'readonly', module: 'writable', fetch: 'readonly',
};

export default [
  {
    ignores: [
      'node_modules/**', 'dist/**', 'release/**', 'android/**', 'coverage/**', 'public/**',
      '**/.agents/**', '.agent/**', '.claude/**', '.husky/**', 'eslint-plugin-bidocs-pdf/**',
      'bidocs.worktrees/**', '**/*.ts', '**/*.tsx',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: node },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }] },
  },
  { files: ['electron/**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: { ...node, window: 'readonly', document: 'readonly' } } },
  {
    // Playwright page.evaluate callbacks run in the browser
    files: ['scripts/e2e-auth.mjs'],
    languageOptions: { globals: { ...node, window: 'readonly', document: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly' } },
  },
];
