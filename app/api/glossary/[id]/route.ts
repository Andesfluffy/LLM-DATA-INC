import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const UpdateBody = z.object({
  term: z.string().min(1).max(120).optional(),
  definition: z.string().min(1).max(2000).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(["metric", "dimension", "filter"]).optional(),
});

export async function PUT(req: NextRequest, ctx: Ctx) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = UpdateBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { org } = await ensureUserAndOrg(user);

  const existing = await prisma.glossaryTerm.findUnique({ where: { id } });
  if (!existing || existing.orgId !== org.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.term !== undefined) data.term = parsed.data.term.toLowerCase().trim();
  if (parsed.data.definition !== undefined) data.definition = parsed.data.definition;
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null;
  if (parsed.data.category !== undefined) data.category = parsed.data.category;

  const updated = await prisma.glossaryTerm.update({ where: { id }, data });
  return NextResponse.json({ term: updated });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { org } = await ensureUserAndOrg(user);

  const existing = await prisma.glossaryTerm.findUnique({ where: { id } });
  if (!existing || existing.orgId !== org.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.glossaryTerm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
