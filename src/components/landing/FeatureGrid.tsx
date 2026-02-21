import { TrendingUp, Users, RefreshCw, BarChart3 } from "lucide-react";

type FeatureGridProps = {
  brandName?: string;
};

const DEFAULT_BRAND = "Data Vista";

export default function FeatureGrid({ brandName = DEFAULT_BRAND }: FeatureGridProps) {
  const features = [
    {
      icon: BarChart3,
      title: "Instant Business Insights",
      desc: "Ask any business question and get answers in seconds — charts, trends, and summaries pulled live from your data.",
    },
    {
      icon: TrendingUp,
      title: "Forecasts & Projections",
      desc: "Go beyond what happened. Spot trends, project future performance, and make decisions ahead of the curve.",
    },
    {
      icon: Users,
      title: "Built for Everyone",
      desc: `${brandName} works for CFOs, ops managers, and analysts alike. No SQL knowledge, no coding — just ask in plain English.`,
    },
    {
      icon: RefreshCw,
      title: "Replaces Manual Reporting",
      desc: "Stop copy-pasting spreadsheets. Automate recurring reports and free your team to focus on decisions, not data wrangling.",
    },
  ];

  return (
    <section>
      <div className="text-center mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-grape-400 mb-3">Why businesses choose us</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
          Everything you need.<br className="hidden sm:inline" /> Nothing you don&apos;t.
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-1 hover:border-white/[0.1]"
          >
            <div className="relative">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-white">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-[-0.01em] text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-grape-400 leading-relaxed">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
