import { RunnerProfile, TrainingDay, RunLog, Shoe, PersonalBest, UserAccount } from '../types.ts';

export interface UserAccountData {
  account: UserAccount;
  profile: RunnerProfile;
  plan: TrainingDay[];
  runs: RunLog[];
  shoes: Shoe[];
  personalBests: PersonalBest[];
}

const ACCOUNTS_STORAGE_KEY = 'runpanda_accounts_v3';
const ACTIVE_ACCOUNT_ID_KEY = 'runpanda_active_account_id_v3';

// Default initial account for Patryk
const DEFAULT_ACCOUNT: UserAccount = {
  id: 'user-patryk-1',
  name: 'Patryk',
  email: 'patrykk1797@gmail.com',
  provider: 'google',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  createdAt: '2026-01-15',
  onboardingCompleted: true,
};

export const loadStoredAccounts = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading accounts:', e);
  }
  // Initialize with default account for easy testing
  saveStoredAccounts([DEFAULT_ACCOUNT]);
  return [DEFAULT_ACCOUNT];
};

export const saveStoredAccounts = (accounts: UserAccount[]): void => {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Error saving accounts:', e);
  }
};

export const getActiveAccountId = (): string | null => {
  try {
    const id = localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY);
    if (id === 'guest_logged_out') return null;
    if (id) return id;
  } catch {}
  return null;
};

export const setActiveAccountId = (id: string | null): void => {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, id);
    } else {
      localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, 'guest_logged_out');
    }
  } catch {}
};

export const loadAccountData = (userId: string): Partial<UserAccountData> => {
  try {
    const key = `runpanda_user_data_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading account data for:', userId, e);
  }
  return {};
};

export const saveAccountData = (userId: string, data: Partial<UserAccountData>): void => {
  try {
    const key = `runpanda_user_data_${userId}`;
    const existing = loadAccountData(userId);
    localStorage.setItem(key, JSON.stringify({ ...existing, ...data }));

    // Silently sync profile and latest run to Cloud SQL database in the background
    if (typeof window !== 'undefined') {
      if (data.profile) {
        fetch('/api/db/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify(data.profile),
        }).catch(() => {});
      }

      if (data.runs && data.runs.length > 0) {
        const latestRun = data.runs[0];
        fetch('/api/db/runs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify(latestRun),
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Error saving account data for:', userId, e);
  }
};

export const deleteAccountData = (userId: string): void => {
  try {
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
