import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isScheduleDueNow, runMonitorForDataSource } from "@/lib/monitoring";

function isAuthorized(req: NextRequest) {
  const secret = process.env.MONITOR_CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const cronHeader = req.headers.get("x-cron-secret") || "";
  return token === secret || cronHeader === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const force = Boolean(body?.force);
  const targetOrgId = typeof body?.orgId === "string" ? body.orgId : undefined;
  const targetDataSourceId = typeof body?.dataSourceId === "string" ? body.dataSourceId : undefined;

  const schedules = await prisma.orgMonitorSchedule.findMany({
    where: {
      enabled: true,
      ...(targetOrgId ? { orgId: targetOrgId } : {}),
    },
  });

  const executions: any[] = [];

  for (const schedule of schedules) {
    if (!force && !isScheduleDueNow(schedule)) continue;

    const datasources = await prisma.dataSource.findMany({
      where: {
        orgId: schedule.orgId,
        ...(targetDataSourceId ? { id: targetDataSourceId } : {}),
      },
      select: { id: true },
    });

    for (const ds of datasources) {
      const result = await runMonitorForDataSource({
        orgId: schedule.orgId,
        dataSourceId: ds.id,
        schedule,
        trigger: force ? "manual" : "cron",
      });
      executions.push({ orgId: schedule.orgId, dataSourceId: ds.id, ...result });
    }
  }

  return NextResponse.json({
    ok: true,
    scheduledCount: schedules.length,
    executedCount: executions.length,
    executions,
  });
}
