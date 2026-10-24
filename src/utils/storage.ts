/**
 * Safe local storage utility with QuotaExceededError protection, automatic
 * legacy cleanup, payload sanitization, and fallback mitigation.
 */

// Keys that are redundant or legacy and can be safely purged if storage is full
const LEGACY_STORAGE_KEYS = [
  'runpanda_user_data_',
  'treda_accounts_v4',
  'treda_accounts_v3',
  'treda_accounts_v2',
  'treda_accounts_v1',
  'runpanda_accounts',
  'treda_active_account_id_v4',
  'treda_active_account_id_v3',
  'treda_active_account_id_v2',
  'treda_active_account_id_v1',
  'runpanda_active_account_id',
  'treda_device_ip_v4',
  'treda_device_ip_v3',
  'treda_device_ip_v2',
  'treda_device_ip_v1',
];

/**
 * Strips huge base64 image strings from run logs before persisting to localStorage
 * so that each workout only occupies ~1-2 KB instead of several megabytes.
 */
export function sanitizeRunForStorage<T>(item: T): T {
  if (!item || typeof item !== 'object') return item;

  if (Array.isArray(item)) {
    return item.map((entry) => sanitizeRunForStorage(entry)) as unknown as T;
  }

  const cloned = { ...item } as Record<string, any>;

  // If this object is a RunLog with a huge screenshotUrl, truncate or remove it from localStorage
  if (typeof cloned.screenshotUrl === 'string' && cloned.screenshotUrl.length > 25000) {
    // Keep a hint that a screenshot existed, but do not store multi-megabyte base64 in localStorage
    cloned.screenshotUrl = undefined;
  }

  // Also sanitize nested runs array if this is user account data
  if (Array.isArray(cloned.runs)) {
    cloned.runs = cloned.runs.map((r: any) => {
      if (r && typeof r === 'object' && typeof r.screenshotUrl === 'string' && r.screenshotUrl.length > 25000) {
        return { ...r, screenshotUrl: undefined };
      }
      return r;
    });
  }

  return cloned as T;
}

/**
 * Free up storage by purging legacy keys and temporary cache.
 */
export function purgeLegacyStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // Purge legacy prefixes
      for (const leg of LEGACY_STORAGE_KEYS) {
        if (k.startsWith(leg) || k === leg) {
          keysToRemove.push(k);
          break;
        }
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch (err) {
    console.warn('Storage purge warning:', err);
  }
}

/**
 * Safe wrapper for localStorage.setItem that catches QuotaExceededError and applies
 * intelligent payload pruning, memory sanitization, and graceful recovery.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  // 1. Direct try
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014 ||
        (typeof err.message === 'string' && err.message.toLowerCase().includes('quota')));

    console.warn(`[SafeStorage] localStorage.setItem failed for key "${key}" (isQuotaError=${isQuotaError}):`, err?.message || err);

    if (!isQuotaError) {
      return false;
    }

    // 2. Recovery attempt 1: Purge legacy keys
    purgeLegacyStorage();

    // If writing treda_workouts, remove redundant duplicate running_runs_v2 to free up 50%
    if (key === 'treda_workouts') {
      try { localStorage.removeItem('running_runs_v2'); } catch {}
    } else if (key === 'running_runs_v2') {
      try { localStorage.removeItem('treda_workouts'); } catch {}
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch {}

    // 3. Recovery attempt 2: Sanitize heavy base64 images from JSON payload
    try {
      const parsed = JSON.parse(value);
      const sanitized = sanitizeRunForStorage(parsed);
      const sanitizedStr = JSON.stringify(sanitized);

      localStorage.setItem(key, sanitizedStr);
      return true;
    } catch {}

    // 4. Recovery attempt 3: If it's an array of items (like runs or plan), keep the most recent 30 items
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 30) {
        const trimmed = sanitizeRunForStorage(parsed.slice(0, 30));
        localStorage.setItem(key, JSON.stringify(trimmed));
        return true;
      }
    } catch {}

    // 5. If everything failed, log quietly without crashing the application
    console.error(`[SafeStorage] Unable to persist key "${key}" after all quota recovery attempts.`);
    return false;
  }
}

/**
 * Safe retrieval from localStorage with fallback
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Failed to read key "${key}":`, err);
    return null;
  }
}

/**
 * Safe removal from localStorage
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Failed to remove key "${key}":`, err);
  }
}
