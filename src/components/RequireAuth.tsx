"use client";

import { ReactNode, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import { useFirebaseAuth } from "@/src/hooks/useFirebaseAuth";
import { Skeleton } from "@/components/ui/skeleton";
import GoogleGlyph from "@/src/components/GoogleGlyph";
import { AUTH_HIGHLIGHTS } from "@/src/components/authHighlights";

type RequireAuthProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

const COMPACT_HIGHLIGHTS = AUTH_HIGHLIGHTS.slice(0, 2);

export default function RequireAuth({ children, title, description }: RequireAuthProps) {
  const { user, loading, signInWithGoogle } = useFirebaseAuth();
  const [authenticating, setAuthenticating] = useState(false);
  const router = useRouter();

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-[#2A2D3A] bg-[#070A14] p-10">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="mt-4 h-10 w-3/4" />
            <Skeleton className="mt-3 h-4 w-2/3" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    const headline = title || "Securely access Data Vista";
    const subhead =
      description ||
      "Authenticate with Google SSO to safeguard your workspace while unlocking AI-powered analytics.";

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

        <div className="relative grid items-center gap-10 px-8 py-10 md:grid-cols-[1.15fr_0.85fr] md:px-12 lg:px-14">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-[11px] uppercase tracking-[0.28em] text-accent">
              Enterprise Google SSO
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-[2.5rem] sm:leading-snug">
                {headline}
              </h1>
              <p className="max-w-2xl text-base text-slate-300 sm:text-lg">{subhead}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {COMPACT_HIGHLIGHTS.map(({ icon: Icon, title: featureTitle, description: featureDescription }) => (
                <div key={featureTitle} className="rounded-2xl border border-[#2A2D3A]/70 bg-[#0B0F12]/70 p-4 backdrop-blur-sm">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                    <Icon className="h-4 w-4" />
                  </div>
                  <dt className="text-sm font-semibold text-white">{featureTitle}</dt>
                  <dd className="mt-1 text-xs text-slate-300">{featureDescription}</dd>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Google keeps every session verified with multi-factor checks and device trust. Disconnect any time from account settings.
            </p>
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
                subtitle="Google verifies every session so Data Vista stays compliant by default."
              />
              <CardBody className="space-y-5">
                <div className="grid gap-3 rounded-2xl border border-[#2A2D3A]/70 bg-[#111726]/70 p-4 text-left text-xs text-slate-300">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">Why Google SSO</span>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-accent" />
                      <p className="leading-relaxed">Verified corporate identity with automatic MFA enforcement.</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-accent" />
                      <p className="leading-relaxed">Granular device trust and session expiry with no passwords to store.</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-accent" />
                      <p className="leading-relaxed">Instant provisioning & offboarding synced with your Google Workspace.</p>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={async () => {
                    setAuthenticating(true);
                    try {
                      await signInWithGoogle();
                    } catch (err) {
                      console.error("Google sign-in failed", err);
                      router.push("/signin");
                    } finally {
                      setAuthenticating(false);
                    }
                  }}
                  variant="primary"
                  className="w-full justify-center gap-3"
                  disabled={authenticating}
                >
                  <GoogleGlyph />
                  {authenticating ? "Connecting..." : "Continue with Google"}
                </Button>

                <p className="text-[11px] text-slate-400">
                  By continuing you accept our Terms and Privacy Policy. Questions? concierge@datavista.ai.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
