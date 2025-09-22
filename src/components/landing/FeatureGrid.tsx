import { ShieldCheck, BrainCircuit, BarChart3, FileText } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Enterprise Guardrails", desc: "SELECT‑only, table allowlist, single‑statement enforcement, LIMIT controls." },
  { icon: BrainCircuit, title: "Schema‑Aware NL→SQL", desc: "LLM prompts include compact schema summaries for precise queries." },
  { icon: BarChart3, title: "Charts & CSV", desc: "Auto line/bar charts for time or categorical results, quick CSV export." },
  { icon: FileText, title: "Audit Logging", desc: "Track prompts, SQL, duration, row counts for every run." },
];

export default function FeatureGrid(){
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
      {features.map((f) => (
        <div
          key={f.title}
          className="rounded-2xl border border-[#2A2D3A] bg-[#23263a]/80 p-5 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <f.icon className="h-5 w-5 text-accent" />
          <h3 className="mt-3 font-semibold tracking-[-0.01em] text-white heading-font">{f.title}</h3>
          <p className="mt-1 text-sm text-gray-300">{f.desc}</p>
        </div>
      ))}
    </section>
  );
}
