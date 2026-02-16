import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { user: dbUser, org } = await ensureUserAndOrg(user);

  const query = await prisma.savedQuery.findFirst({
    where: {
      id,
      orgId: org.id,
      OR: [{ userId: dbUser.id }, { isShared: true }],
    },
  });
  if (!query) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ query });
}

const UpdateBody = z.object({
  name: z.string().max(200).optional(),
  isFavorite: z.boolean().optional(),
  isShared: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function PUT(req: NextRequest, ctx: Ctx) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = UpdateBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { user: dbUser } = await ensureUserAndOrg(user);

  const existing = await prisma.savedQuery.findFirst({
    where: { id, userId: dbUser.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name || null;
  if (parsed.data.isFavorite !== undefined) data.isFavorite = parsed.data.isFavorite;
  if (parsed.data.isShared !== undefined) data.isShared = parsed.data.isShared;
  if (parsed.data.tags !== undefined) data.tags = parsed.data.tags;

  const updated = await prisma.savedQuery.update({ where: { id }, data });
  return NextResponse.json({ query: updated });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { user: dbUser } = await ensureUserAndOrg(user);

  const existing = await prisma.savedQuery.findFirst({
    where: { id, userId: dbUser.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedQuery.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
