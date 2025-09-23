import type { LucideIcon } from "lucide-react";
import { ShieldCheck, Sparkles, LineChart } from "lucide-react";

export type AuthHighlight = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const AUTH_HIGHLIGHTS: AuthHighlight[] = [
  {
    icon: ShieldCheck,
    title: "Trusted SSO",
    description:
      "Sign in with Google to inherit world-class security, MFA, and device safeguards.",
  },
  {
    icon: Sparkles,
    title: "Instant intelligence",
    description:
      "Generate SQL, charts, and narratives trained on your private sources in seconds.",
  },
  {
    icon: LineChart,
    title: "Executive-ready visuals",
    description:
      "Deliver polished dashboards and exports with a single click from Data Vista.",
  },
];
