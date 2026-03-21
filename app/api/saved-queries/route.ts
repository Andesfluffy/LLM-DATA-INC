import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUser } from "@/lib/userOrg";
import { prisma } from "@/lib/db";

const MAX_SAVED = 20;

/** GET — list all saved queries for the current user */
export async function GET(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user: dbUser } = await ensureUser(userAuth);

  const items = await prisma.savedQuery.findMany({
    where: { userId: dbUser.id },
    orderBy: { savedAt: "desc" },
    take: MAX_SAVED,
    select: { id: true, question: true, savedAt: true },
  });

  return NextResponse.json(items);
}

const SaveBody = z.object({ question: z.string().min(1).max(2000) });

/** POST — save a query (upsert to avoid duplicates) */
export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = SaveBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { user: dbUser } = await ensureUser(userAuth);

  // Enforce max saved limit — if at capacity, delete the oldest
  const count = await prisma.savedQuery.count({ where: { userId: dbUser.id } });
  if (count >= MAX_SAVED) {
    const oldest = await prisma.savedQuery.findFirst({
      where: { userId: dbUser.id },
      orderBy: { savedAt: "asc" },
    });
    if (oldest) await prisma.savedQuery.delete({ where: { id: oldest.id } });
  }

  const item = await prisma.savedQuery.upsert({
    where: { userId_question: { userId: dbUser.id, question: parsed.data.question } },
    update: { savedAt: new Date() },
    create: { userId: dbUser.id, question: parsed.data.question },
    select: { id: true, question: true, savedAt: true },
  });

  return NextResponse.json(item, { status: 201 });
}

const DeleteBody = z.object({ id: z.string().min(1) });

/** DELETE — remove a saved query by id */
export async function DELETE(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { user: dbUser } = await ensureUser(userAuth);

  // Only delete if owned by this user
  await prisma.savedQuery.deleteMany({
    where: { id: parsed.data.id, userId: dbUser.id },
  });

  return NextResponse.json({ ok: true });
}
