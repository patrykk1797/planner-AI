import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

/**
 * Returns the verified Firebase ID token for the currently signed-in Firebase user,
 * or null if the user is in local guest/demo mode without a Firebase session.
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Builds HTTP headers including Authorization: Bearer <Firebase ID token> when signed in.
 * Returns null if no Firebase user is authenticated (guest/local mode).
 */
export async function getAuthHeaders(
  extraHeaders: Record<string, string> = {}
): Promise<Record<string, string> | null> {
  const token = await getFirebaseIdToken();
  if (!token) return null;
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}

