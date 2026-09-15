/**
 * safeStorage.ts
 * 
 * Production-Safe Storage Utility for BiDOCS.
 * 
 * Wraps browser localStorage with automatic QuotaExceededError protection,
 * serialization error handling, and safe fallbacks to prevent runtime crashes
 * in restricted environments (e.g. Private Browsing, disabled cookies, storage full).
 */

/**
 * Safely sets an item in localStorage without throwing QuotaExceededError or security exceptions.
 * Returns true if the item was successfully stored, false otherwise.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
      console.warn(`[SafeStorage] localStorage quota exceeded while saving key "${key}". Skipping write.`);
    } else {
      console.warn(`[SafeStorage] Error writing key "${key}" to localStorage:`, err);
    }
    return false;
  }
}

/**
 * Safely serializes and stores an object as JSON.
 */
export function safeSetJson<T>(key: string, data: T): boolean {
  try {
    const serialized = JSON.stringify(data);
    return safeSetItem(key, serialized);
  } catch (err) {
    console.warn(`[SafeStorage] JSON serialization failed for key "${key}":`, err);
    return false;
  }
}

/**
 * Safely retrieves an item from localStorage.
 */
export function safeGetItem(key: string, fallback: string | null = null): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (err) {
    console.warn(`[SafeStorage] Error reading key "${key}" from localStorage:`, err);
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
    console.warn(`[SafeStorage] JSON parse failed for key "${key}", using fallback:`, err);
    return defaultValue;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] Error removing key "${key}" from localStorage:`, err);
    return false;
  }
}
