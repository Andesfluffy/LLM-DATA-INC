import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth-server";
import { requireOrgPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/auditLog";

const Body = z.object({ orgId: z.string().min(1), name: z.string().min(1).max(120), condition: z.string().min(1), destination: z.string().min(1), enabled: z.boolean().optional() });

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId") || "";
  const access = await requireOrgPermission(user, "settings:read", orgId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const alerts = await prisma.alertConfig.findMany({ where: { orgId }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ alerts });
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orgId, ...rest } = parsed.data;
  const access = await requireOrgPermission(user, "settings:write", orgId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const alert = await prisma.alertConfig.create({ data: { orgId, ...rest, updatedById: access.user.id } });
  await logAuditEvent({ orgId, userId: access.user.id, action: "alert.config_updated", targetType: "alert", targetId: alert.id, metadata: { enabled: alert.enabled, destination: alert.destination } });

  return NextResponse.json({ alert });
}
