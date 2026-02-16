import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user: dbUser, org } = await ensureUserAndOrg(userAuth);

  const dashboards = await prisma.dashboard.findMany({
    where: { orgId: org.id, userId: dbUser.id },
    include: { _count: { select: { widgets: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ dashboards });
}

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user: dbUser, org } = await ensureUserAndOrg(userAuth);

  const Body = z.object({ name: z.string().min(1).max(100).optional() });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const dashboard = await prisma.dashboard.create({
    data: {
      orgId: org.id,
      userId: dbUser.id,
      name: parsed.data.name || "My Dashboard",
    },
  });

  return NextResponse.json(dashboard, { status: 201 });
}
