/**
 * lruCache.ts
 * Bounded Least-Recently-Used (LRU) Cache for high-performance memory management.
 * 
 * Prevents memory leaks and out-of-memory crashes as documents scale into the hundreds
 * by enforcing maximum entry count and maximum byte size limits.
 */

export interface LRUCacheOptions<V> {
  maxEntries?: number;
  maxBytes?: number;
  sizeCalculator?: (value: V, key: string) => number;
  onEvict?: (key: string, value: V) => void;
}

export interface LRUStats {
  size: number;
  totalBytes: number;
  maxEntries: number;
  maxBytes: number;
  hits: number;
  misses: number;
  evictions: number;
}

export class LRUCache<K, V> {
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly sizeCalculator: (value: V, key: string) => number;
  private readonly onEvict?: (key: string, value: V) => void;

  private cache = new Map<K, V>();
  private byteSizes = new Map<K, number>();
  private currentBytes = 0;

  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;

  constructor(options: LRUCacheOptions<V> = {}) {
    this.maxEntries = options.maxEntries && options.maxEntries > 0 ? options.maxEntries : 30;
    this.maxBytes = options.maxBytes && options.maxBytes > 0 ? options.maxBytes : 64 * 1024 * 1024; // 64MB default
    this.sizeCalculator = options.sizeCalculator || ((val: V) => {
      if (typeof val === 'string') return val.length * 2; // UTF-16 approx bytes
      return 1024; // Default fallback estimate
    });
    this.onEvict = options.onEvict;
  }

  /** Retrieve an item and promote it to most-recently used */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this.missCount++;
      return undefined;
    }

    this.hitCount++;
    const value = this.cache.get(key)!;
    // Refresh position in Map (re-insert to end)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /** Check if a key exists without promoting its access order */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /** Insert or update an item, evicting oldest entries if limits are exceeded */
  set(key: K, value: V, customBytes?: number): this {
    const newBytes = customBytes !== undefined ? customBytes : this.sizeCalculator(value, String(key));

    // If key already exists, deduct previous size
    if (this.cache.has(key)) {
      this.currentBytes -= (this.byteSizes.get(key) || 0);
      this.cache.delete(key);
      this.byteSizes.delete(key);
    }

    // Insert new item at end (most recently used)
    this.cache.set(key, value);
    this.byteSizes.set(key, newBytes);
    this.currentBytes += newBytes;

    // Trim until within maxEntries and maxBytes
    this.trim();

    return this;
  }

  /** Delete a specific entry */
  delete(key: K): boolean {
    if (!this.cache.has(key)) return false;

    const value = this.cache.get(key)!;
    const bytes = this.byteSizes.get(key) || 0;

    this.cache.delete(key);
    this.byteSizes.delete(key);
    this.currentBytes = Math.max(0, this.currentBytes - bytes);

    if (this.onEvict) {
      this.onEvict(String(key), value);
    }

    return true;
  }

  /** Clear all cached entries */
  clear(): void {
    if (this.onEvict) {
      for (const [key, value] of this.cache.entries()) {
        this.onEvict(String(key), value);
      }
    }
    this.cache.clear();
    this.byteSizes.clear();
    this.currentBytes = 0;
  }

  /** Trim cache from oldest entries (head of Map iterator) */
  private trim(): void {
    while (
      (this.cache.size > this.maxEntries || (this.maxBytes > 0 && this.currentBytes > this.maxBytes)) &&
      this.cache.size > 0
    ) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) break;

      const oldestVal = this.cache.get(oldestKey)!;
      const bytes = this.byteSizes.get(oldestKey) || 0;

      this.cache.delete(oldestKey);
      this.byteSizes.delete(oldestKey);
      this.currentBytes = Math.max(0, this.currentBytes - bytes);
      this.evictionCount++;

      if (this.onEvict) {
        this.onEvict(String(oldestKey), oldestVal);
      }
    }
  }

  /** Current number of items in cache */
  get size(): number {
    return this.cache.size;
  }

  /** Current estimated memory consumption in bytes */
  get totalBytes(): number {
    return this.currentBytes;
  }

  /** Read cache telemetry and metrics */
  getStats(): LRUStats {
    return {
      size: this.cache.size,
      totalBytes: this.currentBytes,
      maxEntries: this.maxEntries,
      maxBytes: this.maxBytes,
      hits: this.hitCount,
      misses: this.missCount,
      evictions: this.evictionCount
    };
  }
}
