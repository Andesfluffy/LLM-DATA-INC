import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUser } from "@/lib/userOrg";
import { prisma } from "@/lib/db";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gate to configured admin email, or deny if not configured
  if (!ADMIN_EMAIL || userAuth.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureUser(userAuth);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalQueries,
    successfulQueries,
    avgDurationRaw,
    activeUsersRaw,
    dailyRaw,
    topQuestionsRaw,
    errorBreakdownRaw,
  ] = await Promise.all([
    prisma.queryAudit.count(),

    prisma.queryAudit.count({ where: { status: "report.generated" } }),

    prisma.queryAudit.aggregate({
      _avg: { durationMs: true },
      where: { status: "report.generated", durationMs: { not: null } },
    }),

    // Distinct users in last 30 days (count only, avoid loading all rows)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "userId") as count FROM "QueryAudit" WHERE "createdAt" >= ${thirtyDaysAgo}
    `,

    // Queries per day for last 30 days
    prisma.queryAudit.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    }),

    // Top 10 questions (successful only)
    prisma.queryAudit.findMany({
      where: { status: "report.generated", nlQuery: { not: null } },
      select: { nlQuery: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),

    // Error breakdown
    prisma.queryAudit.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  // Aggregate daily buckets
  const dailyMap = new Map<string, { success: number; total: number }>();
  for (const row of dailyRaw) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const bucket = dailyMap.get(day) ?? { success: 0, total: 0 };
    bucket.total++;
    if (row.status === "report.generated") bucket.success++;
    dailyMap.set(day, bucket);
  }
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { success, total }]) => ({ date, success, total }));

  // Top questions by frequency
  const qFreq = new Map<string, number>();
  for (const { nlQuery } of topQuestionsRaw) {
    if (nlQuery) qFreq.set(nlQuery, (qFreq.get(nlQuery) ?? 0) + 1);
  }
  const topQuestions = Array.from(qFreq.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([question, count]) => ({ question, count }));

  const successRate = totalQueries > 0 ? successfulQueries / totalQueries : 0;

  return NextResponse.json({
    totalQueries,
    successfulQueries,
    successRate: Math.round(successRate * 1000) / 10, // e.g. 84.5
    avgDurationMs: Math.round(avgDurationRaw._avg.durationMs ?? 0),
    activeUsersLast30d: Number(activeUsersRaw[0]?.count ?? 0),
    daily,
    topQuestions,
    errorBreakdown: errorBreakdownRaw.map((r: { status: string; _count: { status: number } }) => ({
      status: r.status,
      count: r._count.status,
    })),
  });
}
