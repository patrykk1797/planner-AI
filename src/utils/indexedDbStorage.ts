/**
 * Lightweight IndexedDB store for rich media assets (workout screenshots, GPX raw data)
 * to bypass the 5MB browser localStorage limit entirely.
 */

const DB_NAME = 'treda_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'run_screenshots';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores a full-resolution run screenshot in IndexedDB.
 */
export async function saveRunScreenshotToDb(runId: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: runId, dataUrl, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IDB] Failed to store run screenshot:', err);
  }
}

/**
 * Retrieves a stored screenshot for a given run ID from IndexedDB.
 */
export async function getRunScreenshotFromDb(runId: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(runId);

      request.onsuccess = () => {
        resolve(request.result?.dataUrl || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Deletes a stored screenshot from IndexedDB.
 */
export async function deleteRunScreenshotFromDb(runId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(runId);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {}
}
