"use client";

import { auth, authReady, googleProvider } from "@/lib/firebase/client";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthState = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
};

const FirebaseAuthContext = createContext<AuthState | null>(null);

/**
 * Wrap the app once with this provider (e.g. in the root layout).
 * All `useFirebaseAuth()` consumers share the same auth state.
 */
export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let unmounted = false;

    authReady().then(() => {
      if (unmounted) return;
      unsub = onAuthStateChanged(auth, (firebaseUser) => {
        setState({ user: firebaseUser, loading: false });
      });
    });

    return () => {
      unmounted = true;
      unsub?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authReady();
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ ...state, signInWithGoogle, signOut }),
    [state, signInWithGoogle, signOut],
  );

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

/**
 * Hook to access shared Firebase auth state.
 * Must be used within a <FirebaseAuthProvider>.
 */
export function useFirebaseAuth(): AuthState {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error("useFirebaseAuth must be used within a <FirebaseAuthProvider>");
  }
  return ctx;
}
