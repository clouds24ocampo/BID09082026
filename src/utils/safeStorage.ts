/**
 * safeStorage.ts
 *
 * Production-Safe Storage Utility for BiDOCS.
 *
 * Wraps browser localStorage with automatic QuotaExceededError protection,
 * serialization error handling, and safe fallbacks to prevent runtime crashes
 * in restricted environments (e.g. Private Browsing, disabled cookies, storage full).
 */

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as Error & { code?: number }).code;
  return err.name === "QuotaExceededError" || code === 22 || code === 1014;
}

/**
 * Safely sets an item in localStorage without throwing QuotaExceededError or security exceptions.
 * Returns true if the item was successfully stored, false otherwise.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (!hasStorage()) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn(
        `[SafeStorage] localStorage quota exceeded while saving key "${key}". Skipping write.`,
      );
    } else {
      console.warn(
        `[SafeStorage] Error writing key "${key}" to localStorage:`,
        err,
      );
    }
    return false;
  }
}

/**
 * Safely serializes and stores an object as JSON.
 */
export function safeSetJson<T>(key: string, data: T): boolean {
  try {
    return safeSetItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(
      `[SafeStorage] JSON serialization failed for key "${key}":`,
      err,
    );
    return false;
  }
}

/**
 * Safely retrieves an item from localStorage.
 */
export function safeGetItem(
  key: string,
  fallback: string | null = null,
): string | null {
  if (!hasStorage()) return fallback;

  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch (err) {
    console.warn(
      `[SafeStorage] Error reading key "${key}" from localStorage:`,
      err,
    );
    return fallback;
  }
}

/**
 * Safely retrieves and parses a JSON item from localStorage.
 */
export function safeGetJson<T>(key: string, defaultValue: T): T {
  const raw = safeGetItem(key);
  if (!raw) return defaultValue;

  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(
      `[SafeStorage] JSON parse failed for key "${key}", using fallback:`,
      err,
    );
    return defaultValue;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeRemoveItem(key: string): boolean {
  if (!hasStorage()) return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(
      `[SafeStorage] Error removing key "${key}" from localStorage:`,
      err,
    );
    return false;
  }
}
