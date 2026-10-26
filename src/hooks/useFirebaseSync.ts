import { useState, useEffect } from 'react';
import {
  UserAccount,
  RunnerProfile,
  TrainingDay,
  RunLog,
  Shoe,
  PersonalBest,
  RaceSlot,
  AccentColor,
} from '../types.ts';
import { saveAccountData } from '../utils/accountStorage.ts';
import { getAuthHeaders } from '../lib/firebase.ts';

interface UseFirebaseSyncParams {
  currentUser: UserAccount | null;
  profile: RunnerProfile;
  plan: TrainingDay[];
  runs: RunLog[];
  shoes: Shoe[];
  personalBests: PersonalBest[];
  races: RaceSlot[];
  weeklyFocus: string;
  planSummary: string;
  onRestoreCloudData: (cloud: {
    profile?: RunnerProfile;
    shoes?: Shoe[];
    plan?: TrainingDay[];
    races?: RaceSlot[];
    runs?: RunLog[];
    personalBests?: PersonalBest[];
    weeklyFocus?: string;
    planSummary?: string;
  }) => void;
  onSyncAccent?: (accent: AccentColor) => void;
}

export function useFirebaseSync({
  currentUser,
  profile,
  plan,
  runs,
  shoes,
  personalBests,
  races,
  weeklyFocus,
  planSummary,
  onRestoreCloudData,
  onSyncAccent,
}: UseFirebaseSyncParams) {
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  // Sync and restore full user state from Cloud SQL database on mount or user login
  useEffect(() => {
    if (!currentUser?.id) {
      setIsInitialFetchDone(true);
      return;
    }

    getAuthHeaders()
      .then((headers) => {
        if (!headers) return null;
        return fetch('/api/db/user-data', { headers }).then((res) => (res.ok ? res.json() : null));
      })
      .then((data) => {
        if (data && data.userData) {
          const cloud = data.userData;
          if (cloud.profile?.accentColor && onSyncAccent) {
            onSyncAccent(cloud.profile.accentColor);
          }
          onRestoreCloudData(cloud);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsInitialFetchDone(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Continuous local accountStorage auto-save for logged-in users
  useEffect(() => {
    if (currentUser) {
      saveAccountData(currentUser.id, {
        account: currentUser,
        profile,
        plan,
        runs,
        shoes,
        personalBests,
        races,
        weeklyFocus,
        planSummary,
      });
    }
  }, [currentUser, profile, plan, runs, shoes, personalBests, races, weeklyFocus, planSummary]);

  // Debounced (1500 ms) full state persistence to Cloud SQL for logged-in user
  useEffect(() => {
    if (!currentUser) return;
    if (!isInitialFetchDone) return;

    const timer = setTimeout(() => {
      saveAccountData(currentUser.id, {
        profile,
        plan,
        runs,
        shoes,
        personalBests,
        races,
        weeklyFocus,
        planSummary,
      });

      getAuthHeaders({ 'Content-Type': 'application/json' })
        .then((headers) => {
          if (!headers) return;
          return fetch('/api/db/user-data', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userData: {
                profile,
                plan,
                runs,
                shoes,
                personalBests,
                races,
                weeklyFocus,
                planSummary,
              },
            }),
          });
        })
        .catch((e) => console.warn('Debounced Cloud SQL sync warning:', e));
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    currentUser,
    isInitialFetchDone,
    profile,
    plan,
    runs,
    shoes,
    personalBests,
    races,
    weeklyFocus,
    planSummary,
  ]);

  return {
    isInitialFetchDone,
  };
}
