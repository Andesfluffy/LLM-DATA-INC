import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth-server";
import { requireOrgPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";

const Body = z.object({ orgId: z.string().min(1), cidr: z.string().min(1), label: z.string().max(120).optional(), enabled: z.boolean().optional() });

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = req.nextUrl.searchParams.get("orgId") || "";
  const access = await requireOrgPermission(user, "security:admin", orgId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.ipAllowlistEntry.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orgId, cidr, label, enabled } = parsed.data;
  const access = await requireOrgPermission(user, "security:admin", orgId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entry = await prisma.ipAllowlistEntry.create({ data: { orgId, cidr, label: label || null, enabled: enabled ?? true, createdById: access.user.id } });
  return NextResponse.json({ entry }, { status: 201 });
}
