export type AlertTemplateType = "revenue_drop" | "expense_spike" | "refund_anomaly";

export type AlertTemplateContext = {
  metric: string;
  threshold: number;
  observedValue: number;
  orgName?: string | null;
  windowLabel?: string;
};

export type RenderedTemplate = {
  title: string;
  body: string;
};

const templates: Record<AlertTemplateType, (ctx: AlertTemplateContext) => RenderedTemplate> = {
  revenue_drop: (ctx) => ({
    title: `Revenue drop detected for ${ctx.metric}`,
    body: `Observed ${ctx.metric} at ${ctx.observedValue} (threshold ${ctx.threshold})${ctx.windowLabel ? ` in ${ctx.windowLabel}` : ""}. Investigate recent sales pipeline and conversion changes.`,
  }),
  expense_spike: (ctx) => ({
    title: `Expense spike detected for ${ctx.metric}`,
    body: `${ctx.metric} increased to ${ctx.observedValue}, breaching threshold ${ctx.threshold}${ctx.windowLabel ? ` during ${ctx.windowLabel}` : ""}. Review vendor, payroll, or one-off spend contributors.`,
  }),
  refund_anomaly: (ctx) => ({
    title: `Refund anomaly detected for ${ctx.metric}`,
    body: `Refund metric ${ctx.metric} is ${ctx.observedValue}, beyond threshold ${ctx.threshold}${ctx.windowLabel ? ` in ${ctx.windowLabel}` : ""}. Check product quality, payment gateway issues, and fraud indicators.`,
  }),
};

export function renderAlertTemplate(type: AlertTemplateType, context: AlertTemplateContext): RenderedTemplate {
  return templates[type](context);
}
