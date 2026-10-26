import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount } from '../types.ts';
import {
  loadStoredAccounts,
  getActiveAccountId,
  setActiveAccountId,
} from '../utils/accountStorage.ts';
import { auth } from '../lib/firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';

export interface AuthContextValue {
  accounts: UserAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  isGuestDemo: boolean;
  setIsGuestDemo: React.Dispatch<React.SetStateAction<boolean>>;
  deviceIp: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceIp, setDeviceIp] = useState<string | null>(null);
  const [isGuestDemo, setIsGuestDemo] = useState<boolean>(false);

  // User Accounts (Device/IP bound)
  const [accounts, setAccounts] = useState<UserAccount[]>(() => loadStoredAccounts());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const activeId = getActiveAccountId();
    if (!activeId) return null;
    const all = loadStoredAccounts();
    return all.find((a) => a.id === activeId) || null;
  });

  // Device IP detection on load (preserves logged in account across app updates)
  useEffect(() => {
    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.ip) {
          const clientIp = data.ip;
          setDeviceIp(clientIp);

          const validAccounts = loadStoredAccounts(clientIp);
          if (validAccounts.length > 0) {
            setAccounts(validAccounts);
            setCurrentUser((prevUser) => {
              if (prevUser) return prevUser;
              const activeId = getActiveAccountId(clientIp);
              if (activeId) {
                return validAccounts.find((a) => a.id === activeId) || validAccounts[0];
              }
              return null;
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Synchronize Firebase Auth session state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setCurrentUser((prev) => {
          if (prev && prev.id === fbUser.uid) return prev;
          const stored = loadStoredAccounts();
          const matched = stored.find(
            (a) => a.id === fbUser.uid || (fbUser.email && a.email.toLowerCase() === fbUser.email.toLowerCase())
          );
          if (matched) {
            const synced: UserAccount = { ...matched, id: fbUser.uid };
            setActiveAccountId(fbUser.uid);
            return synced;
          }
          const providerId = fbUser.providerData?.[0]?.providerId || '';
          const provider: UserAccount['provider'] = providerId.includes('google')
            ? 'google'
            : providerId.includes('apple')
            ? 'apple'
            : providerId.includes('facebook')
            ? 'facebook'
            : 'email';
          const restored: UserAccount = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Biegacz',
            email: fbUser.email || `${fbUser.uid}@runner.local`,
            provider,
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
            createdAt: new Date().toISOString().split('T')[0],
            onboardingCompleted: true,
          };
          setActiveAccountId(fbUser.uid);
          return restored;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accounts,
        setAccounts,
        currentUser,
        setCurrentUser,
        isGuestDemo,
        setIsGuestDemo,
        deviceIp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
