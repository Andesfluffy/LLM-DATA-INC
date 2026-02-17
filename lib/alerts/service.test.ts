import { describe, expect, it } from "vitest";

import { triggerAlertForAnomaly } from "@/lib/alerts/service";

describe("alert service", () => {
  it("sends alert and records delivery attempts", async () => {
    const ctx = createMockPrisma();

    const events = await triggerAlertForAnomaly({
      orgId: "org-1",
      metric: "revenue",
      observedValue: 120,
      anomalyType: "expense_spike",
      dedupKey: "anomaly-1",
    }, ctx as any);

    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("SENT");
    expect(ctx.store.deliveryAttempts).toHaveLength(2);
  });

  it("suppresses repeated anomaly during cooldown", async () => {
    const ctx = createMockPrisma();

    await triggerAlertForAnomaly({
      orgId: "org-1",
      metric: "revenue",
      observedValue: 120,
      anomalyType: "expense_spike",
      dedupKey: "anomaly-2",
    }, ctx as any);

    const second = await triggerAlertForAnomaly({
      orgId: "org-1",
      metric: "revenue",
      observedValue: 150,
      anomalyType: "expense_spike",
      dedupKey: "anomaly-2",
    }, ctx as any);

    expect(second).toHaveLength(1);
    expect(second[0].status).toBe("SUPPRESSED_COOLDOWN");
    expect(ctx.store.deliveryAttempts).toHaveLength(2);
  });
});

function createMockPrisma() {
  const store = {
    rules: [
      {
        id: "rule-1",
        orgId: "org-1",
        metric: "revenue",
        threshold: 100,
        cooldownMinutes: 60,
        recipients: ["finops@example.com", "cfo@example.com"],
        channel: "EMAIL",
        isEnabled: true,
      },
    ],
    events: [] as any[],
    deliveryAttempts: [] as any[],
    inApp: [] as any[],
  };

  return {
    store,
    alertRule: {
      async findMany({ where }: any) {
        return store.rules.filter((rule) => rule.orgId === where.orgId && rule.metric === where.metric && rule.isEnabled === where.isEnabled);
      },
    },
    alertEvent: {
      async findFirst({ where }: any) {
        return store.events
          .filter((event) => event.ruleId === where.ruleId && event.dedupKey === where.dedupKey && event.sentAt && event.sentAt >= where.sentAt.gte)
          .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0] || null;
      },
      async create({ data }: any) {
        const event = { id: `event-${store.events.length + 1}`, createdAt: new Date(), ...data };
        store.events.push(event);
        return event;
      },
      async update({ where, data }: any) {
        const idx = store.events.findIndex((event) => event.id === where.id);
        store.events[idx] = { ...store.events[idx], ...data };
        return store.events[idx];
      },
    },
    alertDeliveryAttempt: {
      async create({ data }: any) {
        store.deliveryAttempts.push(data);
        return data;
      },
    },
    inAppNotification: {
      async create({ data }: any) {
        store.inApp.push(data);
        return data;
      },
    },
  };
}
