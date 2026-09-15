/**
 * debugLog.ts
 * Production-Safe Diagnostics & Telemetry Utility.
 * 
 * In development, provides formatted diagnostic traces in the browser console.
 * In production, operates silently with zero network overhead unless a remote
 * telemetry endpoint is explicitly configured via VITE_TELEMETRY_ENDPOINT.
 */

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const REMOTE_ENDPOINT = metaEnv?.VITE_TELEMETRY_ENDPOINT;
const IS_DEV = metaEnv ? Boolean(metaEnv.DEV) : false;

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  hypothesisId?: string,
  runId = 'prod'
): void {
  // 1. Console diagnostics for local debugging (non-blocking)
  if (IS_DEV && typeof console !== 'undefined' && console.debug) {
    if (Object.keys(data).length > 0) {
      console.debug(`[BiDOCS] ${location} -> ${message}`, data);
    } else {
      console.debug(`[BiDOCS] ${location} -> ${message}`);
    }
  }

  // 2. Remote ingest only if explicitly configured
  if (REMOTE_ENDPOINT && typeof fetch === 'function') {
    fetch(REMOTE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        runId,
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

