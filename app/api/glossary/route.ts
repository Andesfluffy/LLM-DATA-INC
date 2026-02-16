import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { org } = await ensureUserAndOrg(user);
  if (org.id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const terms = await prisma.glossaryTerm.findMany({
    where: { orgId },
    orderBy: { term: "asc" },
  });

  return NextResponse.json({ terms });
}

const CreateBody = z.object({
  orgId: z.string().min(1),
  term: z.string().min(1).max(120),
  definition: z.string().min(1).max(2000),
  description: z.string().max(500).optional(),
  category: z.enum(["metric", "dimension", "filter"]).default("metric"),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orgId, term, definition, description, category } = parsed.data;
  const { user: dbUser, org } = await ensureUserAndOrg(user);
  if (org.id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.glossaryTerm.create({
    data: {
      orgId,
      term: term.toLowerCase().trim(),
      definition,
      description: description || null,
      category,
      createdById: dbUser.id,
    },
  });

  return NextResponse.json({ term: created }, { status: 201 });
}
