import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { requireOrgPermission } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.ipAllowlistEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await requireOrgPermission(user, "security:admin", existing.orgId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.ipAllowlistEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
