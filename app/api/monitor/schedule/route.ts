import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { prisma } from "@/lib/db";

const UpdateBody = z.object({
  weeklyReportDay: z.number().int().min(0).max(6),
  weeklyReportHour: z.number().int().min(0).max(23),
  weeklyReportMinute: z.number().int().min(0).max(59),
  timezone: z.string().min(1),
  revenueDropThreshold: z.number().min(0).max(1),
  expenseSpikeThreshold: z.number().min(0).max(2),
  refundSpikeThreshold: z.number().min(0).max(2),
  marginDropThreshold: z.number().min(0).max(1),
  enabled: z.boolean(),
});

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { org } = await ensureUserAndOrg(auth);
  const schedule = await prisma.orgMonitorSchedule.findUnique({ where: { orgId: org.id } });
  return NextResponse.json({ schedule });
}

export async function PUT(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = UpdateBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { org } = await ensureUserAndOrg(auth);
  const schedule = await prisma.orgMonitorSchedule.upsert({
    where: { orgId: org.id },
    update: parsed.data,
    create: { orgId: org.id, ...parsed.data },
  });

  return NextResponse.json({ schedule });
}
