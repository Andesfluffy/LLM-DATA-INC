"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import GoogleGlyph from "@/src/components/GoogleGlyph";
import { useFirebaseAuth } from "@/src/hooks/useFirebaseAuth";

const SIGN_IN_FEATURES = [
  {
    title: "AI-assisted SQL",
    description: "Generate governed statements from natural language with full transparency.",
  },
  {
    title: "Visual stories",
    description: "Flip answers into charts, decks, or CSV exports in seconds.",
  },
  {
    title: "Workflow memory",
    description: "Retain history so your team can replay and iterate on prior insights.",
  },
  {
    title: "Enterprise controls",
    description: "Rely on Google SSO, org policies, and per-datasource permissions out of the box.",
  },
];

export default function SignInPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useFirebaseAuth();
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const timeout = window.setTimeout(() => router.replace("/"), 400);
      return () => window.clearTimeout(timeout);
    }
  }, [loading, user, router]);

  async function handleGoogle() {
    setAuthenticating(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      console.error("Google sign-in failed", err);
    } finally {
      setAuthenticating(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#2A2D3A] bg-[#070A14] text-slate-100 shadow-2xl">
      <div className="absolute inset-0">
        <Image
          src="/hero.jpg"
          alt="Data Vista analytics preview"
          fill
          priority
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#070A14]/96 via-[#0F1424]/85 to-[#151C2D]/90" />
        <div className="absolute -left-36 top-6 h-64 w-64 rounded-full bg-accent/25 blur-3xl opacity-40" />
        <div className="absolute -right-32 bottom-0 h-60 w-60 rounded-full bg-primary/25 blur-3xl opacity-40" />
      </div>

      <div className="relative grid items-center gap-10 px-8 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-12 lg:px-14">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-[11px] uppercase tracking-[0.28em] text-accent">
            Data Vista Access
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight text-white sm:text-[2.5rem] sm:leading-snug">
              Sign in with Google to unlock intelligent analytics for your entire company.
            </h1>
            <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
              Keep your workspace private, compliant, and always in sync. Data Vista combines your data sources, AI-assisted SQL, and executive dashboards in one elegant surface.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SIGN_IN_FEATURES.map(({ title, description }) => (
              <div key={title} className="rounded-2xl border border-[#2A2D3A]/70 bg-[#111726]/70 p-4 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{description}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#2A2D3A]/60 bg-[#0B0F12]/60 p-4 text-xs text-slate-300 backdrop-blur">
            "The Data Vista experience is the most intuitive analytics workflow we've used. Our team runs complex questions without ever opening a BI tool."<br />
            <span className="mt-3 inline-block text-[10px] uppercase tracking-[0.3em] text-slate-500">Head of Analytics - Lumen Systems</span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-3xl border border-[#2A2D3A]/70 bg-[#0B0F12]/70 p-6 shadow-lg backdrop-blur">
            <div className="absolute inset-0">
              <Image
                src="/heroooppp.jpg"
                alt="Workspace data visualisation"
                fill
                className="object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#151C2D]/70 via-[#0B0F12]/60 to-transparent" />
            </div>
            <div className="relative flex h-full flex-col justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-200">
                  Live preview
                </span>
                <h2 className="text-lg font-semibold text-white">Unified insights<br />in seconds</h2>
                <p className="text-xs text-slate-300">
                  Ask questions in plain language and deliver executive-ready visuals instantly.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Secure workspace
              </div>
            </div>
          </div>

          <Card className="bg-[#0B0F12]/85 border-[#2A2D3A]/80 backdrop-blur-xl shadow-2xl">
            <CardHeader
              title="Enter with Google"
              subtitle="Google keeps every Data Vista session verified and compliant."
            />
            <CardBody className="space-y-5">
              <div className="grid gap-3 rounded-2xl border border-[#2A2D3A]/70 bg-[#111726]/70 p-4 text-left text-xs text-slate-300">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">You sign in, Google guards</span>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-accent" />
                    <p className="leading-relaxed">Enforced MFA and device trust on every login.</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-accent" />
                    <p className="leading-relaxed">Automatic provisioning tied to Google Workspace roles.</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-accent" />
                    <p className="leading-relaxed">No passwords stored. Ever. Just verified identities.</p>
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleGoogle}
                variant="primary"
                className="w-full justify-center gap-3"
                disabled={authenticating || loading}
              >
                <GoogleGlyph />
                {authenticating ? "Connecting..." : "Continue with Google"}
              </Button>

              <p className="text-[11px] text-slate-400">
                Continuing confirms acceptance of our Terms and Privacy Policy. Need help? concierge@datavista.ai.
              </p>
            </CardBody>
          </Card>

          {!loading && user ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              You are already signed in. Redirecting...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
