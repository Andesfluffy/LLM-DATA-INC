"use client";

import { auth, authReady, googleProvider } from "@/lib/firebase/client";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

type AuthHookState = {
  user: User | null;
  loading: boolean;
};

export function useFirebaseAuth() {
  const [state, setState] = useState<AuthHookState>({ user: null, loading: true });

  useEffect(() => {
    let unsub: (() => void) | undefined;

    // Wait for session persistence to be configured before subscribing
    // to auth state, so we never see a stale persisted user from localStorage.
    authReady().then(() => {
      unsub = onAuthStateChanged(auth, (firebaseUser) => {
        setState({ user: firebaseUser, loading: false });
      });
    });

    return () => unsub?.();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authReady();
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return { ...state, signInWithGoogle, signOut };
}
