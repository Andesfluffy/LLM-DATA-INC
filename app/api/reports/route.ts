import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { prisma } from "@/lib/db";
import { generateWeeklyBusinessReport } from "@/lib/reportGenerator";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { org } = await ensureUserAndOrg(user);
  const weeks = Math.min(12, Math.max(1, Number(req.nextUrl.searchParams.get("weeks") || 6)));
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") || 0));

  const reports = await prisma.weeklyBusinessReport.findMany({
    where: { orgId: org.id },
    include: { sections: { orderBy: { sortOrder: "asc" } }, deliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { periodStart: "desc" },
    skip: offset,
    take: weeks,
  });

  return NextResponse.json({ reports, weeks, offset });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user: dbUser, org } = await ensureUserAndOrg(user);
  const body = await req.json().catch(() => ({}));
  const offsetWeeks = Math.max(0, Number(body?.offsetWeeks || 0));

  try {
    const report = await generateWeeklyBusinessReport(org.id, dbUser.id, offsetWeeks);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
