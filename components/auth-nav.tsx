"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tryGetFirebaseClient } from "@/lib/firebase/client";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

export default function AuthNav() {
  const [user, setUser] = useState<{ email?: string | null } | null>(null);
  const firebase = tryGetFirebaseClient();
  useEffect(() => {
    if (!firebase) return;
    const unsub = onAuthStateChanged(firebase.auth, (u) => setUser(u ? { email: u.email } : null));
    return () => unsub();
  }, [firebase]);
  async function signInGoogle() {
    if (!firebase) return;
    await signInWithPopup(firebase.auth, firebase.googleProvider);
  }
  async function doSignOut() {
    if (!firebase) return;
    await signOut(firebase.auth);
  }
  return (
    <div className="flex items-center gap-2">
      {firebase && user ? (
        <>
          <span className="text-sm text-gray-300 hidden sm:inline">{user.email}</span>
          <button onClick={doSignOut} className="text-sm px-2 py-1 border border-accent text-accent rounded">Sign out</button>
        </>
      ) : (
        <>
          <Link href="/signin" className="text-sm px-2 py-1 border border-accent text-accent rounded">Sign in</Link>
          {firebase && (
            <button onClick={signInGoogle} className="text-sm px-2 py-1 border border-accent text-accent rounded">Google</button>
          )}
        </>
      )}
    </div>
  );
}
