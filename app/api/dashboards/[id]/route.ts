import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user: dbUser } = await ensureUserAndOrg(userAuth);
  const { id } = await context.params;

  const dashboard = await prisma.dashboard.findFirst({
    where: { id, userId: dbUser.id },
    include: {
      widgets: {
        include: { savedQuery: { select: { id: true, question: true, sql: true, name: true } } },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!dashboard) return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  return NextResponse.json(dashboard);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user: dbUser } = await ensureUserAndOrg(userAuth);
  const { id } = await context.params;

  const Body = z.object({ name: z.string().min(1).max(100) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const dashboard = await prisma.dashboard.findFirst({ where: { id, userId: dbUser.id } });
  if (!dashboard) return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });

  const updated = await prisma.dashboard.update({
    where: { id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user: dbUser } = await ensureUserAndOrg(userAuth);
  const { id } = await context.params;

  const dashboard = await prisma.dashboard.findFirst({ where: { id, userId: dbUser.id } });
  if (!dashboard) return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });

  await prisma.dashboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
