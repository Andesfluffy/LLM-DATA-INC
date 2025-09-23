"use client";

import { auth, googleProvider } from "@/lib/firebase/client";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

type AuthHookState = {
  user: User | null;
  loading: boolean;
};

export function useFirebaseAuth() {
  const [state, setState] = useState<AuthHookState>({ user: null, loading: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setState({ user: firebaseUser, loading: false });
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return { ...state, signInWithGoogle, signOut };
}
