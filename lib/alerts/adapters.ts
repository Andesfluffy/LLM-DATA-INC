import type { AlertChannel } from "@prisma/client";

export type AdapterPayload = {
  orgId: string;
  alertEventId: string;
  recipients: string[];
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type AdapterResult = {
  recipient: string;
  status: "SENT" | "FAILED";
  providerId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export interface NotificationAdapter {
  channel: AlertChannel;
  send(payload: AdapterPayload): Promise<AdapterResult[]>;
}

export class EmailNotificationAdapter implements NotificationAdapter {
  channel: AlertChannel = "EMAIL";

  async send(payload: AdapterPayload): Promise<AdapterResult[]> {
    return payload.recipients.map((recipient) => ({
      recipient,
      status: "SENT",
      providerId: `email:${payload.alertEventId}:${recipient}`,
      metadata: { simulated: true },
    }));
  }
}

type PrismaLike = {
  inAppNotification: {
    create(args: any): Promise<any>;
  };
};

export class InAppFeedAdapter implements NotificationAdapter {
  channel: AlertChannel = "IN_APP";

  constructor(private readonly prisma: PrismaLike) {}

  async send(payload: AdapterPayload): Promise<AdapterResult[]> {
    const results: AdapterResult[] = [];
    for (const recipient of payload.recipients) {
      await this.prisma.inAppNotification.create({
        data: {
          orgId: payload.orgId,
          alertEventId: payload.alertEventId,
          recipient,
          title: payload.title,
          body: payload.body,
          metadata: payload.metadata,
        },
      });
      results.push({
        recipient,
        status: "SENT",
        providerId: `in-app:${payload.alertEventId}:${recipient}`,
      });
    }
    return results;
  }
}
