"use client";
import { auth, googleProvider } from "@/lib/firebase/client";
import { signInWithPopup } from "firebase/auth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";

export default function SignInPage() {
  async function signInGoogle() {
    await signInWithPopup(auth, googleProvider);
    window.location.href = "/";
  }
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader title="Sign in to Data Vista" subtitle="Secure Google sign‑in. No passwords to remember." />
        <CardBody>
          <div className="space-y-4">
            <Button onClick={signInGoogle} variant="primary" className="w-full flex items-center justify-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-accent/20 text-accent font-semibold">G</span>
              Continue with Google
            </Button>
            <p className="text-xs text-gray-300">By continuing you agree to our Terms and acknowledge our Privacy Policy.</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
