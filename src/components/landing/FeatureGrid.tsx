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
      title: "Charts & CSV",
      desc: "Automatically render line or bar charts for time and categorical data, and export CSV in one click.",
    },
    {
      icon: FileText,
      title: "Audit Logging",
      desc: "Track prompts, SQL text, timings, and row counts for every run to maintain a full audit trail.",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="rounded-2xl border border-[#2A2D3A] bg-[#23263a]/80 p-5 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <feature.icon className="h-5 w-5 text-accent" />
          <h3 className="mt-3 font-semibold tracking-[-0.01em] text-white heading-font">{feature.title}</h3>
          <p className="mt-1 text-sm text-gray-300">{feature.desc}</p>
        </div>
      ))}
    </section>
  );
}
