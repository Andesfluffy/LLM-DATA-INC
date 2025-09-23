import Link from "next/link";
import Button from "@/src/components/Button";
import Badge from "@/src/components/ui/Badge";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 p-10 md:p-14 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* Animated background accents */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-float-slower" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.5),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(17,24,39,0.5),transparent_50%)]" />

      <div className="relative">
        <div className="mb-4"><Badge className="bg-accent/10 text-accent">New · Guarded NL→SQL</Badge></div>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.02em] leading-tight">
          <span className="bg-gradient-to-r from-primary via-gray-900 to-accent bg-clip-text text-transparent">Ask your data with confidence.</span>
        </h1>
        <p className="mt-3 md:mt-4 text-gray-600 dark:text-gray-300 max-w-2xl text-sm md:text-base">
          Natural language to safe PostgreSQL. Schema-aware, SELECT‑only guardrails, instant charts, and audit logging - in a refined, enterprise‑grade interface.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="#ask" aria-label="Ask a question">
            <Button className="shadow-md">Ask Now</Button>
          </Link>
          <Link href="/settings/datasources">
            <Button variant="secondary">Configure Data Source</Button>
          </Link>
        </div>

        {/* Subtle code preview */}
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-950/60 backdrop-blur">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-900 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="ml-2">Generated SQL</span>
          </div>
          <pre className="p-4 text-xs md:text-sm text-gray-800 dark:text-gray-100 font-mono whitespace-pre-wrap leading-relaxed">
{`WITH revenue AS (
  SELECT date_trunc('day', occurred_at) AS day,
         SUM(qty * unit_price) AS amount
  FROM sales
  WHERE occurred_at >= now() - interval '30 days'
  GROUP BY 1
)
SELECT day, amount
FROM revenue
ORDER BY day ASC LIMIT 100;`}
          </pre>
        </div>
      </div>
    </section>
  );
}

