/**
 * storageScalability.ts
 * Browser Storage Quota, Memory Telemetry, and Main-Thread Yielding utilities.
 * 
 * Provides runtime diagnostics to guarantee smooth 60fps performance and proactive
 * quota monitoring for large document vaults and multi-copy bid packages.
 */

export interface StorageEstimateResult {
  supported: boolean;
  usageBytes: number;
  quotaBytes: number;
  availableBytes: number;
  usagePercentage: number;
  isLowStorage: boolean; // True if less than 100MB or > 90% used
  usageFormatted: string;
  quotaFormatted: string;
}

/** Human-readable byte formatting */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Check available browser storage quota via StorageManager API */
export async function getStorageEstimate(): Promise<StorageEstimateResult> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return {
      supported: false,
      usageBytes: 0,
      quotaBytes: 0,
      availableBytes: 0,
      usagePercentage: 0,
      isLowStorage: false,
      usageFormatted: 'N/A',
      quotaFormatted: 'N/A'
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = Math.max(0, quota - usage);
    const usagePercentage = quota > 0 ? Number(((usage / quota) * 100).toFixed(1)) : 0;
    const isLowStorage = available < 100 * 1024 * 1024 || usagePercentage > 90;

    return {
      supported: true,
      usageBytes: usage,
      quotaBytes: quota,
      availableBytes: available,
      usagePercentage,
      isLowStorage,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota)
    };
  } catch (err) {
    console.warn('[StorageScalability] Unable to estimate storage quota:', err);
    return {
      supported: false,
      usageBytes: 0,
      quotaBytes: 0,
      availableBytes: 0,
      usagePercentage: 0,
      isLowStorage: false,
      usageFormatted: 'Error',
      quotaFormatted: 'Error'
    };
  }
}

/**
 * Non-blocking task yielding utility.
 * 
 * Yields control back to the browser's event loop so UI rendering, CSS animations,
 * and user interactions (typing, scrolling, cancel clicks) are never starved
 * during heavy multi-page PDF generation or database synchronization.
 */
export function yieldToMain(): Promise<void> {
  // Use MessageChannel if available for fastest macro-task scheduling (<0.1ms),
  // falling back to setTimeout(0)
  if (typeof MessageChannel !== 'undefined') {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      channel.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Measure execution duration of asynchronous tasks for performance telemetry.
 */
export async function measurePerformance<T>(taskName: string, task: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await task();
  const durationMs = Number((performance.now() - start).toFixed(2));
  if (durationMs > 250) {
    console.debug(`[BiDOCS Perf] ${taskName} took ${durationMs}ms`);
  }
  return { result, durationMs };
}
