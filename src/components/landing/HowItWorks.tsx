import { Database, MessageSquare, CheckCircle2 } from "lucide-react";

type HowItWorksProps = {
  brandName?: string;
};

const DEFAULT_BRAND = "Data Vista";

export default function HowItWorks({ brandName = DEFAULT_BRAND }: HowItWorksProps) {
  const steps = [
    {
      icon: Database,
      title: "Connect",
      desc: `Add a read-only data source in Settings so ${brandName} can explore your schema safely.`,
    },
    {
      icon: MessageSquare,
      title: "Ask",
      desc: "Type questions in plain English. Guardrails keep generated SQL safe and reviewable.",
    },
    {
      icon: CheckCircle2,
      title: "Review",
      desc: "Get instant results and charts, export a CSV, and inspect the SQL before sharing.",
    },
  ];

  return (
    <section className="relative">
      <div className="text-center mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-grape-400 mb-3">Simple workflow</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
          Three steps to insight
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.1]"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white text-sm font-bold">
                {index + 1}
              </span>
              <step.icon className="h-5 w-5 text-grape-400 opacity-60" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
            <p className="text-sm text-grape-400 leading-relaxed">{step.desc}</p>

            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-3 md:-right-3.5 w-6 h-px bg-gradient-to-r from-white/[0.1] to-transparent" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
