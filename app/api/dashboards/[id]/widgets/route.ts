import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { blockedEntitlementResponse, resolveOrgEntitlements } from "@/lib/entitlements";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user: dbUser, org } = await ensureUserAndOrg(userAuth);
  const entitlements = await resolveOrgEntitlements(org.id);
  if (!entitlements.features.weeklyReports) {
    return NextResponse.json(blockedEntitlementResponse("Dashboard widgets", entitlements, "pro"), { status: 403 });
  }
  const { id } = await context.params;

  const dashboard = await prisma.dashboard.findFirst({ where: { id, userId: dbUser.id } });
  if (!dashboard) return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });

  const Body = z.object({
    savedQueryId: z.string().min(1),
    displayType: z.enum(["table", "chart"]).default("table"),
    position: z.number().int().min(0).default(0),
  });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify the saved query belongs to the same org and is accessible to this user.
  const savedQuery = await prisma.savedQuery.findFirst({
    where: {
      id: parsed.data.savedQueryId,
      orgId: dashboard.orgId,
      OR: [{ userId: dbUser.id }, { isShared: true }],
    },
  });
  if (!savedQuery) return NextResponse.json({ error: "Saved query not found" }, { status: 404 });

  const widget = await prisma.dashboardWidget.create({
    data: {
      dashboardId: id,
      savedQueryId: parsed.data.savedQueryId,
      displayType: parsed.data.displayType,
      position: parsed.data.position,
    },
    include: { savedQuery: { select: { id: true, question: true, sql: true, name: true } } },
  });

  return NextResponse.json(widget, { status: 201 });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user: dbUser, org } = await ensureUserAndOrg(userAuth);
  const entitlements = await resolveOrgEntitlements(org.id);
  if (!entitlements.features.weeklyReports) {
    return NextResponse.json(blockedEntitlementResponse("Dashboard widgets", entitlements, "pro"), { status: 403 });
  }
  const { id } = await context.params;

  const dashboard = await prisma.dashboard.findFirst({ where: { id, userId: dbUser.id } });
  if (!dashboard) return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });

  const Body = z.object({ widgetId: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.dashboardWidget.deleteMany({
    where: { id: parsed.data.widgetId, dashboardId: id },
  });

  return NextResponse.json({ ok: true });
}
