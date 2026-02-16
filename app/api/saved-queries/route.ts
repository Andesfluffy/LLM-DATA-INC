import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user: dbUser, org } = await ensureUserAndOrg(user);
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") || 20)));
  const favoritesOnly = sp.get("favorites") === "true";
  const sharedOnly = sp.get("shared") === "true";
  const tag = sp.get("tag");

  const where: Record<string, unknown> = {
    orgId: org.id,
    OR: [
      { userId: dbUser.id },
      { isShared: true },
    ],
  };
  if (favoritesOnly) { where.isFavorite = true; where.userId = dbUser.id; delete where.OR; }
  if (sharedOnly) { where.isShared = true; delete where.OR; }
  if (tag) { where.tags = { has: tag }; }

  const [queries, total] = await Promise.all([
    prisma.savedQuery.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.savedQuery.count({ where }),
  ]);

  return NextResponse.json({ queries, total, page, limit });
}

const CreateBody = z.object({
  orgId: z.string().min(1),
  question: z.string().min(1),
  sql: z.string().optional(),
  name: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  isShared: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orgId, question, sql, name, tags, isShared } = parsed.data;
  const { user: dbUser, org } = await ensureUserAndOrg(user);
  if (org.id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const query = await prisma.savedQuery.create({
    data: {
      orgId,
      userId: dbUser.id,
      question,
      sql: sql || null,
      name: name || null,
      tags: tags || [],
      isShared: isShared || false,
    },
  });

  return NextResponse.json({ query }, { status: 201 });
}
