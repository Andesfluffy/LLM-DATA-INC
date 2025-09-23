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
    <section className="rounded-2xl border border-[#2A2D3A] p-6 md:p-8 bg-[#23263a]/80">
      <h2 className="text-xl md:text-2xl font-semibold tracking-[-0.01em] mb-4 text-white heading-font">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-2xl border border-[#2A2D3A] p-5 bg-[#0B0F12]/60 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-semibold">
                {index + 1}
              </span>
              <step.icon className="h-4 w-4 text-accent" />
              <span className="font-medium text-white">{step.title}</span>
            </div>
            <p className="mt-2 text-sm text-gray-300">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
