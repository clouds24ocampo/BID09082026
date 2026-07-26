const DEBUG_ENDPOINT = 'http://127.0.0.1:7907/ingest/d6ebe6e0-0ba7-4730-81da-20a89f9eb1cb';
const DEBUG_SESSION = '8f90b6';

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  hypothesisId?: string,
  runId = 'pre-fix'
): void {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
}
