import type { AlertChannel, AlertRule } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EmailNotificationAdapter, InAppFeedAdapter, type NotificationAdapter } from "@/lib/alerts/adapters";
import { renderAlertTemplate, type AlertTemplateType } from "@/lib/alerts/templates";

type PrismaLike = typeof prisma;

export type CreateAlertRuleInput = {
  orgId: string;
  metric: string;
  threshold: number;
  cooldownMinutes: number;
  recipients: string[];
  channel: AlertChannel;
};

export type TriggerAnomalyInput = {
  orgId: string;
  metric: string;
  observedValue: number;
  anomalyType: AlertTemplateType;
  dedupKey?: string;
  metadata?: Record<string, unknown>;
  windowLabel?: string;
};

export async function createAlertRule(input: CreateAlertRuleInput, client: PrismaLike = prisma) {
  return client.alertRule.create({
    data: input,
  });
}

export async function listAlertRules(orgId: string, client: PrismaLike = prisma) {
  return client.alertRule.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
}

function resolveAdapter(channel: AlertChannel, client: PrismaLike): NotificationAdapter {
  if (channel === "IN_APP") {
    return new InAppFeedAdapter(client);
  }
  return new EmailNotificationAdapter();
}

export async function triggerAlertForAnomaly(input: TriggerAnomalyInput, client: PrismaLike = prisma) {
  const rules = await client.alertRule.findMany({
    where: {
      orgId: input.orgId,
      metric: input.metric,
      isEnabled: true,
    },
  });

  const events = [];

  for (const rule of rules) {
    if (input.observedValue < rule.threshold) {
      continue;
    }

    const dedupKey = input.dedupKey || `${rule.id}:${input.metric}:${input.anomalyType}`;
    const cooldownStart = new Date(Date.now() - rule.cooldownMinutes * 60_000);

    const recent = await client.alertEvent.findFirst({
      where: {
        ruleId: rule.id,
        dedupKey,
        sentAt: { gte: cooldownStart },
      },
      orderBy: { sentAt: "desc" },
    });

    const rendered = renderAlertTemplate(input.anomalyType, {
      metric: input.metric,
      threshold: rule.threshold,
      observedValue: input.observedValue,
      windowLabel: input.windowLabel,
    });

    if (recent) {
      const suppressed = await client.alertEvent.create({
        data: {
          orgId: input.orgId,
          ruleId: rule.id,
          anomalyType: input.anomalyType,
          dedupKey,
          title: rendered.title,
          body: rendered.body,
          metadata: input.metadata,
          status: "SUPPRESSED_COOLDOWN",
          suppressReason: `Suppressed by cooldown until ${new Date(recent.sentAt!.getTime() + rule.cooldownMinutes * 60_000).toISOString()}`,
        },
      });
      events.push(suppressed);
      continue;
    }

    const event = await client.alertEvent.create({
      data: {
        orgId: input.orgId,
        ruleId: rule.id,
        anomalyType: input.anomalyType,
        dedupKey,
        title: rendered.title,
        body: rendered.body,
        metadata: input.metadata,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    const adapter = resolveAdapter(rule.channel, client);
    const attempts = await adapter.send({
      orgId: input.orgId,
      alertEventId: event.id,
      recipients: rule.recipients,
      title: rendered.title,
      body: rendered.body,
      metadata: input.metadata,
    });

    let hasFailure = false;
    for (const attempt of attempts) {
      await client.alertDeliveryAttempt.create({
        data: {
          alertEventId: event.id,
          channel: rule.channel,
          recipient: attempt.recipient,
          status: attempt.status,
          providerId: attempt.providerId,
          errorMessage: attempt.errorMessage,
          metadata: attempt.metadata,
        },
      });
      if (attempt.status === "FAILED") {
        hasFailure = true;
      }
    }

    if (hasFailure) {
      const updated = await client.alertEvent.update({
        where: { id: event.id },
        data: { status: "DELIVERY_FAILED" },
      });
      events.push(updated);
    } else {
      events.push(event);
    }
  }

  return events;
}
