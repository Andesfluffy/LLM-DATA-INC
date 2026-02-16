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
import { toast } from "@/src/components/ui/Toast";

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
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-10">
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
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
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
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#070A14] text-grape-200 shadow-2xl">
        {/* Cinematic photo backdrop */}
        <div className="absolute inset-0">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.15]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#070A14]/95 via-[#0F1424]/80 to-[#151C2D]/85" />
          <div className="absolute -left-40 top-10 h-72 w-72 rounded-full bg-purple-600/15 blur-[100px]" />
          <div className="absolute -right-32 bottom-10 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
        </div>

        <div className="relative px-5 py-10 sm:px-8 sm:py-14 md:px-12 lg:px-16">
          {/* Logo + badge row */}
          <div className="mb-8 flex items-center gap-3 sm:mb-10 sm:gap-4">
            <Image
              src="/logo.png"
              alt="Data Vista"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Data Vista</h2>
              <span className="text-[10px] uppercase tracking-[0.3em] text-grape-500">Intelligent Analytics</span>
            </div>
          </div>

          <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
            {/* Left: headline + features */}
            <div className="space-y-8">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-purple-300 sm:px-4 sm:text-[11px] sm:tracking-[0.28em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Enterprise Google SSO
                </div>
                <h1 className="text-2xl font-bold leading-tight text-white sm:text-[2.75rem] sm:leading-[1.15] tracking-[-0.02em]">
                  {headline}
                </h1>
                <p className="max-w-xl text-sm text-grape-300 sm:text-lg leading-relaxed">{subhead}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {COMPACT_HIGHLIGHTS.map(({ icon: Icon, title: featureTitle, description: featureDescription }) => (
                  <div key={featureTitle} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm transition hover:border-white/[0.1] hover:bg-white/[0.04]">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] text-white transition group-hover:from-purple-500/20 group-hover:to-blue-500/10">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <dt className="text-sm font-semibold text-white">{featureTitle}</dt>
                    <dd className="mt-1.5 text-xs text-grape-400 leading-relaxed">{featureDescription}</dd>
                  </div>
                ))}
              </div>

              <p className="text-xs text-grape-500 leading-relaxed">
                Google keeps every session verified with multi-factor checks and device trust. Disconnect any time from account settings.
              </p>
            </div>

            {/* Right: preview + sign-in card */}
            <div className="flex flex-col gap-6">
              {/* Decorative preview card with photo */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0F12]/70 p-6 shadow-lg backdrop-blur">
                <div className="absolute inset-0">
                  <Image
                    src="/heroooppp.jpg"
                    alt="Workspace data visualisation"
                    fill
                    className="object-cover opacity-30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#151C2D]/80 via-[#0B0F12]/70 to-transparent" />
                </div>
                <div className="relative flex h-full flex-col justify-between">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-grape-300">
                      Live preview
                    </span>
                    <h2 className="text-base sm:text-lg font-semibold text-white">Unified insights<br />in seconds</h2>
                    <p className="text-xs text-grape-300">
                      Ask questions in plain language and deliver executive-ready visuals instantly.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-grape-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-mint-400" /> Secure workspace
                  </div>
                </div>
              </div>

              <Card className="bg-[#0B0F12]/80 border-white/[0.08] backdrop-blur-xl shadow-2xl">
                <CardHeader
                  title="Enter with Google"
                  subtitle="Google verifies every session so Data Vista stays compliant by default."
                />
                <CardBody className="space-y-5">
                  <Button
                    onClick={async () => {
                      setAuthenticating(true);
                      try {
                        await signInWithGoogle();
                        toast.success("Signed in successfully.");
                        setTimeout(() => router.push("/"), 150);
                      } catch (err) {
                        console.error("Google sign-in failed", err);
                        toast.error("Google sign-in failed. Please try again.");
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
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
