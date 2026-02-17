import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { org } = await ensureUserAndOrg(auth);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 20)));

  const runs = await prisma.monitorRun.findMany({
    where: { orgId: org.id },
    include: {
      findings: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ runs });
}
