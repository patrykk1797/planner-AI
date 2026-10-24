import type { RunnerProfile, TrainingDay, RunLog, Shoe, PersonalBest, UserAccount, RaceSlot } from '../types.ts';
import { safeLocalStorageSet, sanitizeRunForStorage } from './storage.ts';

export interface UserSettings {
  subscriptionTier: 'PRO' | 'LITE';
  isPro: boolean;
  theme: 'dark' | 'light';
  accentColor: string;
  coachTone: 'naukowy' | 'motywacyjny' | 'minimalistyczny';
  autoSyncEnabled: boolean;
}

export interface UserAccountData {
  account: UserAccount;
  profile: RunnerProfile;
  plan: TrainingDay[];
  runs: RunLog[];
  shoes: Shoe[];
  personalBests: PersonalBest[];
  settings: UserSettings;
  races?: RaceSlot[];
  weeklyFocus?: string;
  planSummary?: string;
}

// PERMANENT STORAGE KEYS: Stable and preserved across all application updates
const ACCOUNTS_STORAGE_KEY = 'treda_accounts_permanent';
const ACTIVE_ACCOUNT_ID_KEY = 'treda_active_account_id_permanent';
const DEVICE_ID_KEY = 'treda_device_id_permanent';
const DEVICE_IP_KEY = 'treda_device_ip_permanent';

// Legacy keys for automatic migration across version updates
const LEGACY_ACCOUNTS_KEYS = ['treda_accounts_v4', 'treda_accounts_v3', 'treda_accounts_v2', 'treda_accounts_v1', 'treda_accounts', 'runpanda_accounts'];
const LEGACY_ACTIVE_ID_KEYS = ['treda_active_account_id_v4', 'treda_active_account_id_v3', 'treda_active_account_id_v2', 'treda_active_account_id_v1', 'treda_active_account_id', 'runpanda_active_account_id'];
const LEGACY_IP_KEYS = ['treda_device_ip_v4', 'treda_device_ip_v3', 'treda_device_ip_v2', 'treda_device_ip_v1'];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  subscriptionTier: 'PRO',
  isPro: true,
  theme: 'dark',
  accentColor: 'orange',
  coachTone: 'naukowy',
  autoSyncEnabled: true,
};

/**
 * Gets or creates a persistent device ID bound to this browser instance.
 * Guaranteed to persist across application updates, page refreshes, and network switches.
 */
export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server_device';
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = localStorage.getItem('treda_device_id') || localStorage.getItem('runpanda_device_id');
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      }
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'fallback_device';
  }
};

/**
 * Performs automatic backward compatibility migration from previous version keys.
 */
const migrateLegacyStorage = (): void => {
  if (typeof window === 'undefined') return;
  try {
    // 1. Migrate accounts
    if (!localStorage.getItem(ACCOUNTS_STORAGE_KEY)) {
      for (const legacyKey of LEGACY_ACCOUNTS_KEYS) {
        const legacyVal = localStorage.getItem(legacyKey);
        if (legacyVal) {
          try {
            const parsed = JSON.parse(legacyVal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localStorage.setItem(ACCOUNTS_STORAGE_KEY, legacyVal);
              break;
            }
          } catch {}
        }
      }
    }

    // 2. Migrate active account ID
    if (!localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY)) {
      for (const legacyKey of LEGACY_ACTIVE_ID_KEYS) {
        const legacyId = localStorage.getItem(legacyKey);
        if (legacyId && legacyId !== 'guest_logged_out') {
          localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, legacyId);
          break;
        }
      }
    }

    // 3. Migrate device IP
    if (!localStorage.getItem(DEVICE_IP_KEY)) {
      for (const legacyKey of LEGACY_IP_KEYS) {
        const legacyIp = localStorage.getItem(legacyKey);
        if (legacyIp) {
          localStorage.setItem(DEVICE_IP_KEY, legacyIp);
          break;
        }
      }
    }
  } catch (e) {
    console.warn('Storage migration notice:', e);
  }
};

/**
 * Loads stored accounts for this device.
 * When the app is updated on this device, existing accounts and session remain intact.
 * On a fresh/different device (different browser storage), returns empty array.
 */
export const loadStoredAccounts = (currentIp?: string): UserAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    migrateLegacyStorage();
    getOrCreateDeviceId();

    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // If current IP is provided, keep this authorized device's IP updated without logging out
      if (currentIp) {
        localStorage.setItem(DEVICE_IP_KEY, currentIp);
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading accounts:', e);
  }
  return [];
};

/**
 * Saves stored accounts to permanent local storage on this device.
 */
export const saveStoredAccounts = (accounts: UserAccount[], currentIp?: string): void => {
  if (typeof window === 'undefined') return;
  try {
    safeLocalStorageSet(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    if (currentIp) {
      safeLocalStorageSet(DEVICE_IP_KEY, currentIp);
    }
  } catch (e) {
    console.error('Error saving accounts:', e);
  }
};

/**
 * Gets the active account ID on this device.
 * Preserved across application updates on this device.
 */
export const getActiveAccountId = (currentIp?: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    migrateLegacyStorage();

    const id = localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY);
    if (id === 'guest_logged_out') return null;
    if (id) {
      if (currentIp) {
        safeLocalStorageSet(DEVICE_IP_KEY, currentIp);
      }
      return id;
    }
  } catch {}
  return null;
};

/**
 * Sets the active account ID on this device.
 */
export const setActiveAccountId = (id: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      safeLocalStorageSet(ACTIVE_ACCOUNT_ID_KEY, id);
    } else {
      safeLocalStorageSet(ACTIVE_ACCOUNT_ID_KEY, 'guest_logged_out');
    }
  } catch {}
};

/**
 * Loads cached account data for a specific user ID.
 */
export const loadAccountData = (userId: string): Partial<UserAccountData> => {
  if (typeof window === 'undefined') return {};
  try {
    // Check modern permanent key first, then fallback to legacy
    const primaryKey = `treda_user_data_${userId}`;
    const legacyKey = `runpanda_user_data_${userId}`;
    const raw = localStorage.getItem(primaryKey) || localStorage.getItem(legacyKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading account data for:', userId, e);
  }
  return {};
};

/**
 * Saves account data and synchronizes to Cloud SQL database so user data is never lost.
 */
export const saveAccountData = (userId: string, data: Partial<UserAccountData>): void => {
  if (typeof window === 'undefined') return;
  try {
    const primaryKey = `treda_user_data_${userId}`;
    const existing = loadAccountData(userId);
    const sanitizedIncoming = sanitizeRunForStorage(data);
    const combined = { ...existing, ...sanitizedIncoming };
    const sanitizedCombined = sanitizeRunForStorage(combined);
    safeLocalStorageSet(primaryKey, JSON.stringify(sanitizedCombined));

    // Silently sync full user progress to Cloud SQL database for permanent multi-device restoration
    fetch('/api/db/user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(sanitizedCombined),
    }).catch(() => {});
  } catch (e) {
    console.error('Error saving account data for:', userId, e);
  }
};

/**
 * Deletes user account data from this device.
 */
export const deleteAccountData = (userId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`treda_user_data_${userId}`);
    localStorage.removeItem(`runpanda_user_data_${userId}`);
    const accounts = loadStoredAccounts().filter((a) => a.id !== userId);
    saveStoredAccounts(accounts);
    if (getActiveAccountId() === userId) {
      setActiveAccountId(accounts.length > 0 ? accounts[0].id : null);
    }
  } catch (e) {
    console.error('Error deleting account:', userId, e);
  }
};
