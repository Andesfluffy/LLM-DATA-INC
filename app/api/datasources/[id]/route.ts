import { NextRequest, NextResponse } from "next/server";

import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { deleteManagedUploadFile, extractCsvFilePath } from "@/lib/csvStorage";
import { prisma } from "@/lib/db";
import { findAccessibleDataSource } from "@/lib/userOrg";
import { requireOrgPermission } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/auditLog";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const access = await requireOrgPermission(userAuth, "datasource:edit");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user: dbUser, org } = access;
  const { id } = await context.params;

  const ds = await findAccessibleDataSource({
    userId: dbUser.id,
    datasourceId: id,
  });
  if (!ds) {
    return NextResponse.json({ error: "Data source not found" }, { status: 404 });
  }
  if (ds.ownerId && ds.ownerId !== dbUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filePath = ds.type === "csv" ? extractCsvFilePath(ds.metadata) : null;

  try {
    await prisma.dataSource.delete({ where: { id: ds.id } });
  } catch {
    return NextResponse.json(
      { error: "Unable to remove this data source right now. Please try again." },
      { status: 409 },
    );
  }

  let cleanupWarning: string | null = null;
  if (filePath) {
    const cleanup = deleteManagedUploadFile(filePath);
    if (!cleanup.deleted && cleanup.reason && cleanup.reason !== "not_found") {
      cleanupWarning = "Data source removed, but uploaded file cleanup needs attention.";
    }
  }

  await logAuditEvent({
    orgId: org.id,
    userId: dbUser.id,
    action: "datasource.disconnect",
    targetType: "datasource",
    targetId: ds.id,
    metadata: { type: ds.type, name: ds.name },
  });

  return NextResponse.json({ ok: true, id: ds.id, ...(cleanupWarning ? { cleanupWarning } : {}) });
}
