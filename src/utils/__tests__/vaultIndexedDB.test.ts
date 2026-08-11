import { describe, it, expect } from 'vitest';
import { saveVaultItems, loadVaultItems } from '../vaultIndexedDB';

describe('vaultIndexedDB', () => {
  it('should expose vault storage API functions', () => {
    expect(saveVaultItems).toBeDefined();
    expect(typeof saveVaultItems).toBe('function');
    expect(loadVaultItems).toBeDefined();
    expect(typeof loadVaultItems).toBe('function');
  });
});
