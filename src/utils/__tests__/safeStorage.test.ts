import { describe, it, expect, beforeEach, vi } from 'vitest';

// Polyfill localStorage and window for Node environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => (key in mockStorage ? mockStorage[key] : null),
  setItem: (key: string, value: string) => { mockStorage[key] = String(value); },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  get length() { return Object.keys(mockStorage).length; }
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
  });
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    localStorage: localStorageMock
  };
} else if (!globalThis.window.localStorage) {
  (globalThis.window as any).localStorage = localStorageMock;
}

import {
  safeSetItem,
  safeGetItem,
  safeSetJson,
  safeGetJson,
  safeRemoveItem
} from '../safeStorage';

describe('safeStorage Utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should store and retrieve string values correctly', () => {
    const success = safeSetItem('test_key', 'hello world');
    expect(success).toBe(true);

    const retrieved = safeGetItem('test_key');
    expect(retrieved).toBe('hello world');
  });

  it('should store and retrieve typed JSON objects correctly', () => {
    const payload = {
      tenantId: 'tenant-123',
      companyName: 'Metro Builders Inc.',
      count: 42,
      active: true
    };

    const success = safeSetJson('test_json_key', payload);
    expect(success).toBe(true);

    const retrieved = safeGetJson('test_json_key', { fallback: true });
    expect(retrieved).toEqual(payload);
  });

  it('should return defaultValue when parsing invalid JSON', () => {
    localStorage.setItem('corrupt_key', '{not valid json');
    const fallback = { fallback: true };
    const result = safeGetJson('corrupt_key', fallback);
    expect(result).toEqual(fallback);
  });

  it('should return null or fallback when key does not exist', () => {
    expect(safeGetItem('non_existent')).toBeNull();
    expect(safeGetItem('non_existent', 'default_val')).toBe('default_val');
  });

  it('should safely remove stored items', () => {
    safeSetItem('to_remove', 'value');
    expect(safeGetItem('to_remove')).toBe('value');

    safeRemoveItem('to_remove');
    expect(safeGetItem('to_remove')).toBeNull();
  });

  it('should catch QuotaExceededError without throwing an unhandled exception', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      const err = new Error('Quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const success = safeSetItem('overflow_key', 'large data');
    expect(success).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('quota exceeded'));

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
