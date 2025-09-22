"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase/client";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

export default function AuthNav() {
  const [user, setUser] = useState<{ email?: string | null } | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ? { email: u.email } : null));
    return () => unsub();
  }, []);
  async function signInGoogle() {
    await signInWithPopup(auth, googleProvider);
  }
  async function doSignOut() {
    await signOut(auth);
  }
  return (
    <div className="flex items-center gap-2">
      {user ? (
        <>
          <span className="text-sm text-gray-300 hidden sm:inline">{user.email}</span>
          <button onClick={doSignOut} className="text-sm px-2 py-1 border border-accent text-accent rounded">Sign out</button>
        </>
      ) : (
        <>
          <Link href="/signin" className="text-sm px-2 py-1 border border-accent text-accent rounded">Sign in</Link>
          <button onClick={signInGoogle} className="text-sm px-2 py-1 border border-accent text-accent rounded">Google</button>
        </>
      )}
    </div>
  );
}
