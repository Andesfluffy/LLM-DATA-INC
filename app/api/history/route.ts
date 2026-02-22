import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUser } from "@/lib/userOrg";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user: dbUser } = await ensureUser(userAuth);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  const audits = await prisma.queryAudit.findMany({
    where: { userId: dbUser.id, nlQuery: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      nlQuery: true,
      executedSql: true,
      status: true,
      durationMs: true,
      rowCount: true,
      createdAt: true,
      dataSource: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ history: audits });
}
