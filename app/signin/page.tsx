"use client";
import { tryGetFirebaseClient } from "@/lib/firebase/client";
import { signInWithPopup } from "firebase/auth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";

export default function SignInPage() {
  const firebase = tryGetFirebaseClient();
  async function signInGoogle() {
    if (!firebase) return;
    await signInWithPopup(firebase.auth, firebase.googleProvider);
    window.location.href = "/";
  }
  if (!firebase) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader title="Sign in unavailable" subtitle="Firebase client configuration is missing." />
          <CardBody>
            <p className="text-sm text-gray-300">
              Provide NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and
              NEXT_PUBLIC_FIREBASE_APP_ID to enable authentication.
            </p>
          </CardBody>
        </Card>
      </div>
    );
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
