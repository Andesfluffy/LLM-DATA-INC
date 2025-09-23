"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "@/src/components/ui/Toast";
import Button, { buttonClassName } from "@/src/components/Button";
import GoogleGlyph from "@/src/components/GoogleGlyph";
import { useFirebaseAuth } from "@/src/hooks/useFirebaseAuth";
import Modal from "@/src/components/ui/Modal";
import { Skeleton } from "@/components/ui/skeleton";

const HERO_REDIRECT_DELAY_MS = 520;

export default function AuthNav() {
  const { user, loading, signInWithGoogle, signOut: firebaseSignOut } = useFirebaseAuth();
  const [authenticating, setAuthenticating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const signInRedirectTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (signInRedirectTimeout.current !== null) {
        window.clearTimeout(signInRedirectTimeout.current);
        signInRedirectTimeout.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMenuOpen(false);
    }
  }, [user]);

  async function handleSignIn() {
    setAuthenticating(true);
    try {
      await signInWithGoogle();
      toast.success("Signed in successfully. Redirecting to the hero.");
      signInRedirectTimeout.current = window.setTimeout(() => {
        router.push("/#hero");
      }, HERO_REDIRECT_DELAY_MS);
    } catch (error) {
      console.error("Google sign-in failed", error);
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await firebaseSignOut();
      setConfirmOpen(false);
      toast.success("Signed out securely.");
    } catch (error) {
      console.error("Sign out failed", error);
      toast.error("Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const compactButtonClass = buttonClassName({ variant: "secondary", className: "px-4" });
  const menuSignOutButtonClass = buttonClassName({ variant: "secondary", className: "w-full justify-start text-left" });

  return (
    <div className="flex items-center gap-3">
      {loading ? (
        <Skeleton className="h-9 w-9 rounded-full" />
      ) : user ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/70 bg-accent/15 text-sm font-semibold text-accent transition hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label="Account menu"
          >
            {(user.displayName || user.email || "").slice(0, 1).toUpperCase() || "G"}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-[#2A2D3A] bg-[#0B0F12]/95 p-4 text-left shadow-xl backdrop-blur">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {user.displayName || user.email?.split("@")[0] || "Account"}
                </p>
                {user.email ? (
                  <p className="break-all text-xs text-slate-400">{user.email}</p>
                ) : null}
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <Link
                  href="/history"
                  className="flex items-center justify-between rounded-xl border border-transparent bg-[#111726]/70 px-3 py-2 transition hover:border-accent/50 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  History
                  <span className="text-[10px] uppercase tracking-[0.24em] text-accent">H</span>
                </Link>
                <Link
                  href="/settings/datasources"
                  className="flex items-center justify-between rounded-xl border border-transparent bg-[#111726]/70 px-3 py-2 transition hover:border-accent/50 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Data sources
                  <span className="text-[10px] uppercase tracking-[0.24em] text-accent">S</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className={menuSignOutButtonClass}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSignIn}
          className={compactButtonClass}
          disabled={authenticating}
        >
          <GoogleGlyph />
          {authenticating ? "Connecting..." : "Sign in"}
        </button>
      )}

      <Modal open={confirmOpen} onClose={() => { if (!signingOut) setConfirmOpen(false); }}>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-white">Ready to sign out?</h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Your secure session will close immediately. You can reconnect with Google SSO anytime.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={signingOut}>
              Stay
            </Button>
            <Button variant="secondary" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
