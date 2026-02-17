import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";

const updateSchema = z.object({
  metric: z.string().min(1).optional(),
  threshold: z.number().optional(),
  cooldownMinutes: z.number().int().positive().optional(),
  recipients: z.array(z.string().min(1)).min(1).optional(),
  channel: z.enum(["EMAIL", "IN_APP"]).optional(),
  isEnabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const { org } = await ensureUserAndOrg(auth);

  const existing = await prisma.alertRule.findFirst({ where: { id, orgId: org.id } });
  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const updated = await prisma.alertRule.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const { org } = await ensureUserAndOrg(auth);

  const existing = await prisma.alertRule.findFirst({ where: { id, orgId: org.id } });
  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  await prisma.alertRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
