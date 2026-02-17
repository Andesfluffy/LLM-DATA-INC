import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { requireOrgPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId") || "";
  const access = await requireOrgPermission(user, "security:admin", orgId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.auditLog.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 5000 });
  const header = "timestamp,action,userId,targetType,targetId,question,sql,rowCount,durationMs\n";
  const body = rows
    .map((r: typeof rows[number]) => [r.createdAt.toISOString(), r.action, r.userId || "", r.targetType || "", r.targetId || "", JSON.stringify(r.question || ""), JSON.stringify(r.sql || ""), r.rowCount ?? "", r.durationMs ?? ""].join(","))
    .join("\n");

  return new NextResponse(`${header}${body}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=audit-${orgId}.csv`,
    },
  });
}
