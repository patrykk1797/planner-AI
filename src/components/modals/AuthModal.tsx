import React, { useState } from 'react';
import { UserAccount } from '../../types.ts';
import { auth, googleAuthProvider, getAuthHeaders } from '../../lib/firebase.ts';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  FacebookAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { AppIcon } from '../icons/AppIcon.tsx';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (account: UserAccount, isNewRegistration?: boolean) => void;
  existingAccounts: UserAccount[];
  currentAccountId: string | null;
  showToast: (msg: string) => void;
  initialTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  existingAccounts,
  currentAccountId,
  showToast,
  initialTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register form
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState<string>('');

  // Account linking state
  const [accountLinkPrompt, setAccountLinkPrompt] = useState<{
    existingAccount: UserAccount;
    newProvider: 'email' | 'google' | 'facebook' | 'apple';
    newAccountData: UserAccount;
  } | null>(null);

  const processLoginOrLink = async (
    email: string,
    provider: 'email' | 'google' | 'facebook' | 'apple',
    newAcc: UserAccount,
    isRegisterTab: boolean = false
  ) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check local accounts on this device
    let existing = existingAccounts.find(
      (a) => a.email.toLowerCase() === cleanEmail
    );

    // 2. If not found locally and user is authenticated with Firebase, check Cloud SQL database
    if (!existing) {
      try {
        const authHeaders = await getAuthHeaders();
        if (authHeaders) {
          const res = await fetch(`/api/db/user-by-email?email=${encodeURIComponent(cleanEmail)}`, {
            headers: authHeaders,
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.found && data.user) {
              const u = data.user;
              const full = data.userData || {};
              const fullAcc = full.account || {};
              existing = {
                id: u.uid,
                name: u.name || fullAcc.name || cleanEmail.split('@')[0],
                email: u.email,
                avatar: u.avatar || fullAcc.avatar,
                provider: fullAcc.provider || provider,
                linkedProviders: fullAcc.linkedProviders || [fullAcc.provider || provider],
                createdAt: fullAcc.createdAt || new Date().toISOString().slice(0, 10),
                onboardingCompleted: Boolean(fullAcc.onboardingCompleted ?? true),
                isPro: Boolean(fullAcc.isPro ?? true),
                subscriptionTier: fullAcc.subscriptionTier || 'PRO',
              };
            }
          }
        }
      } catch (err) {
        console.warn('Could not query user-by-email:', err);
      }
    }

    // 3. If account already exists with this email
    if (existing) {
      // Ensure existing account ID aligns with verified Firebase UID
      const syncedExisting: UserAccount = {
        ...existing,
        id: newAcc.id || existing.id,
      };
      const isAlreadyLinked =
        syncedExisting.provider === provider ||
        (syncedExisting.linkedProviders || []).includes(provider);

      if (isAlreadyLinked) {
        onLoginSuccess(syncedExisting, false);
        showToast(`Witaj ponownie, ${syncedExisting.name}! Zalogowano do Twojego konta.`);
        onClose();
        return;
      }

      setAccountLinkPrompt({
        existingAccount: syncedExisting,
        newProvider: provider,
        newAccountData: newAcc,
      });
      return;
    }

    // 4. No existing account found anywhere -> create/log in
    onLoginSuccess(newAcc, isRegisterTab);
    showToast(
      isRegisterTab
        ? `Konto utworzone pomyślnie! Witaj w Treda 🏃`
        : `Zalogowano pomyślnie jako ${newAcc.name}!`
    );
    onClose();
  };

  const handleConfirmLink = () => {
    if (!accountLinkPrompt) return;
    const { existingAccount, newProvider, newAccountData } = accountLinkPrompt;
    const linked = Array.from(
      new Set([
        ...(existingAccount.linkedProviders || []),
        existingAccount.provider,
        newProvider,
      ])
    );
    const updated: UserAccount = {
      ...existingAccount,
      id: newAccountData.id || existingAccount.id,
      linkedProviders: linked,
    };
    onLoginSuccess(updated, false);

    getAuthHeaders({ 'Content-Type': 'application/json' })
      .then((headers) => {
        if (!headers) return;
        return fetch('/api/db/user-data', {
          method: 'POST',
          headers,
          body: JSON.stringify({ account: updated }),
        });
      })
      .catch(() => {});

    showToast(
      `Konta powiązane! Możesz teraz logować się przez ${newProvider.toUpperCase()} lub dotychczasową metodę (${existingAccount.provider.toUpperCase()}) do tego samego konta.`
    );
    setAccountLinkPrompt(null);
    onClose();
  };

  const handleDeclineLink = () => {
    if (!accountLinkPrompt) return;
    const { newAccountData } = accountLinkPrompt;
    onLoginSuccess(newAccountData, false);
    showToast(`Zalogowano jako ${newAccountData.name} (osobne konto)!`);
    setAccountLinkPrompt(null);
    onClose();
  };

  const handlePasswordReset = async () => {
    const cleanEmail = loginEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Wprowadź swój adres e-mail w polu powyżej, aby zresetować hasło.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      showToast('Link do resetowania hasła został wysłany na podany adres e-mail.');
    } catch (err: any) {
      console.warn('Password reset error:', err);
      showToast('Nie udało się wysłać linku resetującego. Sprawdź poprawność adresu e-mail.');
    }
  };

  const handleClassicLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('Wprowadź e-mail i hasło');
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const user = credential.user;
      const idToken = await user.getIdToken();

      fetch('/api/db/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      }).catch(() => {});

      const newAcc: UserAccount = {
        id: user.uid,
        name: user.displayName || loginEmail.split('@')[0],
        email: user.email || loginEmail.trim(),
        provider: 'email',
        avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${loginEmail.trim()}`,
        createdAt: new Date().toISOString().split('T')[0],
        onboardingCompleted: true,
      };

      await processLoginOrLink(newAcc.email, 'email', newAcc, false);
    } catch (err: any) {
      console.warn('Firebase email login error:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        showToast('Nieprawidłowy adres e-mail lub hasło.');
      } else if (code === 'auth/too-many-requests') {
        showToast('Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za chwilę.');
      } else if (code === 'auth/operation-not-allowed') {
        showToast('Logowanie e-mail/hasło nie jest włączone w konsoli Firebase Authentication.');
      } else {
        showToast('Błąd logowania. Sprawdź dane i spróbuj ponownie.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClassicRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      showToast('Wpisz swoje imię');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      showToast('Wprowadź prawidłowy adres e-mail');
      return;
    }
    if (regPassword.length < 6) {
      showToast('Hasło musi mieć co najmniej 6 znaków');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      showToast('Hasła nie są identyczne');
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      const user = credential.user;
      await updateProfile(user, {
        displayName: regName.trim(),
      }).catch(() => {});

      const idToken = await user.getIdToken(true);

      fetch('/api/db/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      }).catch(() => {});

      const newAcc: UserAccount = {
        id: user.uid,
        name: regName.trim(),
        email: user.email || regEmail.trim(),
        provider: 'email',
        avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${regEmail.trim()}`,
        createdAt: new Date().toISOString().split('T')[0],
        onboardingCompleted: false,
      };

      onLoginSuccess(newAcc, true);
      showToast(`Konto utworzone! Dane wyzerowane dla nowego profilu 🚀`);
      onClose();
    } catch (err: any) {
      console.warn('Firebase email register error:', err);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        showToast('Ten adres e-mail jest już zarejestrowany. Przejdź do zakładki Logowanie.');
      } else if (code === 'auth/weak-password') {
        showToast('Hasło jest zbyt słabe (wymagane minimum 6 znaków).');
      } else if (code === 'auth/invalid-email') {
        showToast('Podany adres e-mail jest nieprawidłowy.');
      } else if (code === 'auth/operation-not-allowed') {
        showToast('Rejestracja e-mail/hasło nie jest włączona w konsoli Firebase Authentication.');
      } else {
        showToast('Nie udało się utworzyć konta. Spróbuj ponownie.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerSocialAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setIsSubmitting(true);
    try {
      let result;
      if (provider === 'google') {
        result = await signInWithPopup(auth, googleAuthProvider);
      } else if (provider === 'apple') {
        const appleProvider = new OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        result = await signInWithPopup(auth, appleProvider);
      } else {
        const fbProvider = new FacebookAuthProvider();
        fbProvider.addScope('email');
        fbProvider.addScope('public_profile');
        result = await signInWithPopup(auth, fbProvider);
      }

      const user = result.user;
      const idToken = await user.getIdToken();

      fetch('/api/db/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      }).catch(() => {});

      const account: UserAccount = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Biegacz',
        email: user.email || `${user.uid}@${provider}.oauth`,
        provider,
        avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        createdAt: new Date().toISOString().split('T')[0],
        onboardingCompleted: tab === 'register' ? false : true,
      };

      await processLoginOrLink(account.email, provider, account, tab === 'register');
    } catch (err: any) {
      console.warn(`${provider} OAuth popup error:`, err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        showToast('Logowanie zostało anulowane.');
      } else {
        showToast(
          `Logowanie przez ${provider.toUpperCase()} nie powiodło się. Upewnij się, że dostawca jest aktywny w Firebase Authentication.`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overscroll-contain h-[100dvh] w-screen overflow-y-auto animate-ios"
    >
      <div className="liquid-glass w-full max-w-md p-6 space-y-5 animate-ios-modal max-h-[90dvh] overflow-y-auto no-scrollbar relative border border-white/10 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppIcon size="md" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                RunPanda Pro 2027
              </span>
              <h2 className="text-base font-bold txt-main">Konto Biegacza</h2>
            </div>
          </div>
          {currentAccountId && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij"
              className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-muted hover:text-white"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-black/30 border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`py-2 rounded-lg transition-all ${
              tab === 'login'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            Logowanie
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`py-2 rounded-lg transition-all ${
              tab === 'register'
                ? 'accent-bg text-black font-black shadow-md'
                : 'txt-sub hover:text-white'
            }`}
          >
            Załóż konto
          </button>
        </div>

        {/* Social Logins */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => triggerSocialAuth('google')}
            className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold txt-main flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-98"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {tab === 'login' ? 'Kontynuuj z Google' : 'Zarejestruj z Google'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => triggerSocialAuth('apple')}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold txt-main flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.79-11.73-14.24-6.62-10.33-11.83-21.73-15.63-34.22-3.8-12.49-5.7-24.16-5.7-35.01 0-14.38 3.58-26.65 10.74-36.81 7.16-10.16 16.32-15.34 27.49-15.54 4.58 0 9.8 1.15 15.67 3.46 5.86 2.31 9.7 3.51 11.51 3.61 1.48-.1 5.38-1.33 11.71-3.69 6.33-2.36 11.59-3.41 15.78-3.15 12.06.84 21.68 5.43 28.87 13.78-10.59 6.43-15.77 15.37-15.54 26.83.23 9.07 3.69 16.71 10.39 22.92 6.7 6.21 14.67 9.87 23.92 10.98-2.33 7.02-5.18 13.93-8.54 20.73zM119.22 33.15c0-6.9 2.5-13.38 7.5-19.44 5-6.06 11.23-9.76 18.69-11.11.1 1.05.15 2 .15 2.85 0 6.9-2.6 13.43-7.8 19.59-5.2 6.16-11.49 9.86-18.87 11.11-.1-.84-.17-1.84-.17-3z" />
              </svg>
              Apple ID
            </button>

            <button
              type="button"
              onClick={() => triggerSocialAuth('facebook')}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold txt-main flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-white/10"></div>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            lub klasycznie e-mail
          </span>
          <div className="h-[1px] flex-1 bg-white/10"></div>
        </div>

        {/* Form */}
        {tab === 'login' ? (
          <form onSubmit={handleClassicLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold txt-sub mb-1">
                Adres E-mail
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="biegacz@runpanda.pl"
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs txt-main focus:outline-none focus:border-amber-400/80 transition-all"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold txt-sub">Hasło</label>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-[10px] accent-text hover:underline"
                >
                  Zapomniałeś?
                </button>
              </div>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs txt-main focus:outline-none focus:border-amber-400/80 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl accent-btn-gradient text-xs font-black uppercase tracking-wider transition-all mt-2 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? 'Logowanie...' : 'Zaloguj się do profilu'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleClassicRegister} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold txt-sub mb-1">
                Imię lub Nick biegacza
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="np. Patryk, Kasia"
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs txt-main focus:outline-none focus:border-amber-400/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold txt-sub mb-1">
                Adres E-mail
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="twoj@email.pl"
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs txt-main focus:outline-none focus:border-amber-400/80 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold txt-sub mb-1">
                  Hasło (min. 6)
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs txt-main focus:outline-none focus:border-amber-400/80 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold txt-sub mb-1">
                  Powtórz hasło
                </label>
                <input
                  type="password"
                  required
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs txt-main focus:outline-none focus:border-amber-400/80 transition-all"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl accent-soft-bg border accent-soft-border text-[11px] txt-main">
              💡 <strong>Panel kalibracyjny:</strong> Po kliknięciu przejdziesz do konfiguratora celów, wagi, tętna i rekordu na 5 km.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl accent-btn-gradient text-xs font-black uppercase tracking-wider transition-all mt-2 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? 'Tworzenie konta...' : 'Dalej: Kalibracja potencjału i celów →'}
            </button>
          </form>
        )}

        {/* Existing Accounts quick switch */}
        {existingAccounts.length > 0 && (
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider txt-muted block">
              Zapisane profile na tym urządzeniu:
            </span>
            <div className="flex flex-wrap gap-2">
              {existingAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    onLoginSuccess(acc, false);
                    showToast(`Przełączono na konto: ${acc.name}`);
                    onClose();
                  }}
                  className={`flex items-center gap-2 p-1.5 pr-3 rounded-full text-xs font-bold transition-all border ${
                    acc.id === currentAccountId
                      ? 'accent-badge font-black'
                      : 'bg-white/5 border-white/10 txt-sub hover:border-white/30'
                  }`}
                >
                  <img
                    src={acc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={acc.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span>{acc.name}</span>
                  <span className="text-[9px] opacity-60 uppercase">({acc.provider})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {accountLinkPrompt && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-ios">
            <div className="liquid-glass w-full max-w-md p-6 space-y-4 border border-white/15 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔗</span>
                <div>
                  <h3 className="text-base font-black txt-main">Powiązanie Istniejącego Konta</h3>
                  <span className="text-[10px] accent-text font-bold">Wykryto ten sam adres e-mail</span>
                </div>
              </div>

              <p className="text-xs txt-sub leading-relaxed">
                Adres e-mail <strong className="text-white">{accountLinkPrompt.existingAccount.email}</strong> jest już zarejestrowany przy użyciu metody <strong className="text-white uppercase">{accountLinkPrompt.existingAccount.provider}</strong>.
                <br /><br />
                Czy chcesz powiązać konta, aby w przyszłości móc logować się zarówno przez <strong className="text-white uppercase">{accountLinkPrompt.existingAccount.provider}</strong>, jak i nową metodę (<strong className="text-white uppercase">{accountLinkPrompt.newProvider}</strong>)?
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDeclineLink}
                  className="py-2.5 px-3 rounded-xl liquid-pill font-bold text-xs txt-sub hover:text-white"
                >
                  Nie, osobne konto
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLink}
                  className="py-2.5 px-3 rounded-xl accent-btn-gradient text-slate-950 font-black text-xs shadow-md hover:brightness-110"
                >
                  Tak, powiąż konta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
