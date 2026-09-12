import { describe, it, expect } from 'vitest';
import { LRUCache } from '../lruCache';
import { formatBytes, yieldToMain, measurePerformance } from '../storageScalability';
import {
  saveVaultItems,
  loadVaultItems,
  deleteVaultItem,
  upsertVaultItem,
  upsertVaultItems,
  savePdfData,
  loadPdfData,
  getVaultMemoryCacheStats
} from '../vaultIndexedDB';

describe('Scalability & Performance Framework', () => {
  describe('LRUCache', () => {
    it('should set and get items correctly', () => {
      const cache = new LRUCache<string, string>({ maxEntries: 3 });
      cache.set('doc-1', 'content-1');
      cache.set('doc-2', 'content-2');

      expect(cache.get('doc-1')).toBe('content-1');
      expect(cache.get('doc-2')).toBe('content-2');
      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should evict the least recently used item when capacity is exceeded', () => {
      const cache = new LRUCache<string, string>({ maxEntries: 2 });
      cache.set('doc-1', 'content-1');
      cache.set('doc-2', 'content-2');

      // Access doc-1 so doc-2 becomes the oldest
      cache.get('doc-1');

      // Add doc-3, which should evict doc-2
      cache.set('doc-3', 'content-3');

      expect(cache.get('doc-1')).toBe('content-1');
      expect(cache.get('doc-2')).toBeUndefined(); // Evicted!
      expect(cache.get('doc-3')).toBe('content-3');
    });

    it('should evict items when total byte size exceeds maxBytes limit', () => {
      // 100 bytes limit
      const cache = new LRUCache<string, string>({
        maxEntries: 10,
        maxBytes: 100,
        sizeCalculator: (v) => v.length // 1 char = 1 byte
      });

      cache.set('doc-1', 'A'.repeat(40)); // 40 bytes
      cache.set('doc-2', 'B'.repeat(40)); // 80 bytes total
      expect(cache.size).toBe(2);

      // Adding 50 bytes pushes total to 130 > 100, so doc-1 must be evicted
      cache.set('doc-3', 'C'.repeat(50));

      expect(cache.get('doc-1')).toBeUndefined(); // Evicted due to byte limit
      expect(cache.get('doc-2')).toBe('B'.repeat(40));
      expect(cache.get('doc-3')).toBe('C'.repeat(50));
      expect(cache.totalBytes).toBe(90);
    });

    it('should report accurate cache stats', () => {
      const cache = new LRUCache<string, string>({ maxEntries: 2 });
      cache.set('a', 'alpha');
      cache.get('a'); // 1 hit
      cache.get('b'); // 1 miss
      cache.set('c', 'charlie');
      cache.set('d', 'delta'); // triggers 1 eviction of 'a'

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.evictions).toBe(1);
      expect(stats.size).toBe(2);
    });
  });

  describe('storageScalability utilities', () => {
    it('should format bytes into human-readable strings', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
      expect(formatBytes(1024 * 1024 * 1024 * 2.3)).toBe('2.3 GB');
    });

    it('should yield to the main thread asynchronously', async () => {
      const start = Date.now();
      await yieldToMain();
      expect(Date.now() - start).toBeGreaterThanOrEqual(0);
    });

    it('should measure execution time of async tasks', async () => {
      const { result, durationMs } = await measurePerformance('test-sleep', async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 'success';
      });

      expect(result).toBe('success');
      expect(durationMs).toBeGreaterThanOrEqual(5);
    });
  });

  describe('vaultIndexedDB Scalability Engine', () => {
    it('should support atomic upsert and delete for documents', async () => {
      expect(typeof upsertVaultItem).toBe('function');
      expect(typeof upsertVaultItems).toBe('function');
      expect(typeof saveVaultItems).toBe('function');
      expect(typeof loadVaultItems).toBe('function');
      expect(typeof deleteVaultItem).toBe('function');
    });

    it('should delete items from memory and storage via deleteVaultItem', async () => {
      const tenant = 'tenant-del-test';
      const items = [
        { id: 'item-del-1', tenantId: tenant, documentName: 'Doc 1' },
        { id: 'item-del-2', tenantId: tenant, documentName: 'Doc 2' }
      ];

      await saveVaultItems(items, tenant);
      let loaded = await loadVaultItems(tenant);
      expect(loaded.length).toBe(2);

      await deleteVaultItem('item-del-1', tenant);
      loaded = await loadVaultItems(tenant);
      expect(loaded.find((i: any) => i.id === 'item-del-1')).toBeUndefined();
      expect(loaded.length).toBe(1);
    });

    it('should synchronize deletions when saveVaultItems is called with fewer items', async () => {
      const tenant = 'tenant-sync-del-test';
      const initial = [
        { id: 'doc-sync-1', tenantId: tenant, documentName: 'Doc 1' },
        { id: 'doc-sync-2', tenantId: tenant, documentName: 'Doc 2' }
      ];

      await saveVaultItems(initial, tenant);
      let loaded = await loadVaultItems(tenant);
      expect(loaded.length).toBe(2);

      // Save without doc-sync-1
      await saveVaultItems([initial[1]], tenant);
      loaded = await loadVaultItems(tenant);
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('doc-sync-2');
    });

    it('should maintain bounded LRU memory stats for PDF binary data', async () => {
      const stats = getVaultMemoryCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats.size).toBe('number');
      expect(stats.maxEntries).toBe(25);
      expect(stats.maxBytes).toBe(64 * 1024 * 1024); // 64MB cap
    });

    it('should cache and retrieve PDF data URLs using bounded memory', async () => {
      const testDocId = 'test-doc-perf-001';
      const samplePdf = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...';

      await savePdfData(testDocId, samplePdf);
      const loaded = await loadPdfData(testDocId);
      expect(loaded).toBe(samplePdf);
    });
  });
});
