import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth-server";
import { requireOrgPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { encryptPassword } from "@/lib/datasourceSecrets";
import { logAuditEvent } from "@/lib/auditLog";

const Body = z.object({ orgId: z.string().min(1), datasourceId: z.string().min(1), newSecret: z.string().min(1).optional(), notes: z.string().max(500).optional() });

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orgId, datasourceId, newSecret, notes } = parsed.data;
  const access = await requireOrgPermission(user, "security:admin", orgId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ds = await prisma.dataSource.findFirst({ where: { id: datasourceId, orgId } });
  if (!ds) return NextResponse.json({ error: "Data source not found" }, { status: 404 });

  if (newSecret) {
    const encrypted = encryptPassword(newSecret);
    await prisma.dataSource.update({ where: { id: ds.id }, data: { passwordCiphertext: encrypted.ciphertext, passwordIv: encrypted.iv, passwordTag: encrypted.authTag } });
  }

  await prisma.secretRotationEvent.create({ data: { orgId, userId: access.user.id, datasourceId, notes: notes || null } });
  await logAuditEvent({ orgId, userId: access.user.id, action: "security.secret_rotated", targetType: "datasource", targetId: datasourceId, metadata: { hasNewSecret: Boolean(newSecret) } });

  return NextResponse.json({ ok: true });
}
