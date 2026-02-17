import { prisma } from "@/lib/db";

export type BillingPlan = "free" | "pro" | "growth" | "enterprise";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export type OrgEntitlements = {
  orgId: string;
  plan: BillingPlan;
  status: SubscriptionStatus;
  seats: number;
  limits: Record<string, unknown>;
  features: {
    manualCsv: boolean;
    liveDb: boolean;
    weeklyReports: boolean;
    alerts: boolean;
    multiSource: boolean;
    complianceControls: boolean;
    teamControls: boolean;
  };
};

const DEFAULT_LIMITS: Record<BillingPlan, Record<string, unknown>> = {
  free: { maxSources: 1, maxSeats: 1, maxMonthlyQueries: 500 },
  pro: { maxSources: 5, maxSeats: 5, maxMonthlyQueries: 5000 },
  growth: { maxSources: 25, maxSeats: 20, maxMonthlyQueries: 50000 },
  enterprise: { maxSources: "unlimited", maxSeats: "unlimited", maxMonthlyQueries: "unlimited" },
};

function planFeatures(plan: BillingPlan): OrgEntitlements["features"] {
  return {
    manualCsv: true,
    liveDb: plan !== "free",
    weeklyReports: plan === "pro" || plan === "growth" || plan === "enterprise",
    alerts: plan === "growth" || plan === "enterprise",
    multiSource: plan === "growth" || plan === "enterprise",
    complianceControls: plan === "enterprise",
    teamControls: plan === "enterprise",
  };
}

function normalizePlan(raw: string | null | undefined): BillingPlan {
  switch ((raw || "").toLowerCase()) {
    case "pro":
      return "pro";
    case "growth":
      return "growth";
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}

function normalizeStatus(raw: string | null | undefined): SubscriptionStatus {
  switch ((raw || "").toLowerCase()) {
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "active";
  }
}

export async function resolveOrgEntitlements(orgId: string): Promise<OrgEntitlements> {
  const subscriptionClient = (prisma as any).subscription;
  if (!subscriptionClient?.upsert) {
    return {
      orgId,
      plan: "free",
      status: "active",
      seats: 1,
      limits: DEFAULT_LIMITS.free,
      features: planFeatures("free"),
    };
  }

  const subscription = await subscriptionClient.upsert({
    where: { orgId },
    update: {},
    create: {
      orgId,
      plan: "FREE",
      status: "ACTIVE",
      seats: 1,
      limits: DEFAULT_LIMITS.free,
    },
  });

  const plan = normalizePlan(subscription.plan);
  const limits = (subscription.limits as Record<string, unknown> | null) || DEFAULT_LIMITS[plan];

  return {
    orgId,
    plan,
    status: normalizeStatus(subscription.status),
    seats: subscription.seats || 1,
    limits,
    features: planFeatures(plan),
  };
}

export function buildUpgradePrompt(feature: string, plan: BillingPlan): string {
  if (plan === "free") {
    return `${feature} is available on paid plans. Upgrade to Pro or higher to continue.`;
  }
  if (plan === "pro") {
    return `${feature} requires the Growth plan or above.`;
  }
  if (plan === "growth") {
    return `${feature} requires the Enterprise plan.`;
  }
  return `${feature} is unavailable for this subscription state.`;
}

export function blockedEntitlementResponse(feature: string, entitlements: OrgEntitlements, requiredPlan: BillingPlan) {
  return {
    error: buildUpgradePrompt(feature, entitlements.plan),
    code: "ENTITLEMENT_REQUIRED",
    currentPlan: entitlements.plan,
    requiredPlan,
    upgradeUrl: "/settings/billing",
    entitlements,
  };
}
