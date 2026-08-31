import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Global mocks for Node environment
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

if (!globalThis.localStorage) {
  (globalThis as any).localStorage = mockLocalStorage;
}
if (!globalThis.window) {
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    location: { href: 'http://localhost:3001/' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}
if (!globalThis.document) {
  (globalThis as any).document = {
    documentElement: { style: { setProperty: () => {} } },
    getElementById: () => ({ appendChild: () => {} }),
    body: { appendChild: () => {} }
  };
}

import App from '../../App';

describe('App Root Render Test', () => {
  it('should render App in simulated environment without throwing exceptions', () => {
    const html = renderToString(React.createElement(App));
    console.log('RENDERED HTML PREVIEW:', html.slice(0, 250));
    expect(html.length).toBeGreaterThan(0);
  });
});
