import { Database, MessageSquare, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Database,
    title: "Connect",
    desc: "Add a read‑only Postgres data source in Settings.",
  },
  {
    icon: MessageSquare,
    title: "Ask",
    desc: "Type a question in plain English. Guardrails keep SQL safe.",
  },
  {
    icon: CheckCircle2,
    title: "Review",
    desc: "Get results and charts instantly. Export CSV. View SQL.",
  },
];

export default function HowItWorks() {
  return (
    <section className="rounded-2xl border border-[#2A2D3A] p-6 md:p-8 bg-[#23263a]/80">
      <h2 className="text-xl md:text-2xl font-semibold tracking-[-0.01em] mb-4 text-white heading-font">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="rounded-2xl border border-[#2A2D3A] p-5 bg-[#0B0F12]/60 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-semibold">{i + 1}</span>
              <s.icon className="h-4 w-4 text-accent" />
              <span className="font-medium text-white">{s.title}</span>
            </div>
            <p className="mt-2 text-sm text-gray-300">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
