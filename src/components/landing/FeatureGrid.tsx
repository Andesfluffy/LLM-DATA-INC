import { ShieldCheck, BrainCircuit, BarChart3, FileText } from "lucide-react";

type FeatureGridProps = {
  brandName?: string;
};

const DEFAULT_BRAND = "Data Vista";

export default function FeatureGrid({ brandName = DEFAULT_BRAND }: FeatureGridProps) {
  const features = [
    {
      icon: ShieldCheck,
      title: "Enterprise Guardrails",
      desc: `${brandName} enforces SELECT-only access, single-statement execution, and LIMIT controls by default.`,
    },
    {
      icon: BrainCircuit,
      title: "Schema-Aware NL-to-SQL",
      desc: "LLM prompts include compact schema summaries so generated queries stay accurate.",
    },
    {
      icon: BarChart3,
      title: "Charts & CSV Export",
      desc: "Automatically render line or bar charts for time and categorical data, and export CSV in one click.",
    },
    {
      icon: FileText,
      title: "Audit Logging",
      desc: "Track prompts, SQL text, timings, and row counts for every run to maintain a full audit trail.",
    },
  ];

  return (
    <section>
      <div className="text-center mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-grape-400 mb-3">Why teams choose us</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
          Built for security.<br className="hidden sm:inline" /> Designed for speed.
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
