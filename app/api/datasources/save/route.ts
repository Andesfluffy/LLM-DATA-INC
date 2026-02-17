import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { encryptPassword } from "@/lib/datasourceSecrets";
import { getConnector } from "@/lib/connectors/registry";
import "@/lib/connectors/init";
import { requireOrgPermission } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/auditLog";
import { z } from "zod";
import { resolveOrgEntitlements, blockedEntitlementResponse } from "@/lib/entitlements";

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const Body = z.object({
    name: z.string().min(1),
    type: z.string().default("postgres"),
    host: z.string().optional(),
    port: z.coerce.number().int().positive().optional(),
    database: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    monitoredTables: z.array(z.string().min(1)).optional(),
  });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const body = parsed.data;
  const { name, type, monitoredTables } = body;

  if (type === "csv") {
    return NextResponse.json(
      { error: "Spreadsheet sources are created via file upload. Use 'Upload & Connect' for CSV/Excel files." },
      { status: 400 },
    );
  }

  let factory;
  try {
    factory = getConnector(type);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unsupported connector type" }, { status: 400 });
  }

  const validation = factory.validateParams(body as Record<string, unknown>);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.errors.join(". ") }, { status: 400 });
  }

  const access = await requireOrgPermission(userAuth, "datasource:edit");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user: dbUser, org } = access;
  const hasPassword = Object.prototype.hasOwnProperty.call(body, "password");
  const password = hasPassword ? body.password : undefined;
  const usesPassword = type === "postgres" || type === "mysql";

  let passwordFields: Partial<Record<string, string | null>> = {};
  if (usesPassword && hasPassword) {
    if (password) {
      try {
        const encrypted = encryptPassword(password);
        passwordFields = {
          passwordCiphertext: encrypted.ciphertext,
          passwordIv: encrypted.iv,
          passwordTag: encrypted.authTag,
        };
      } catch (error) {
        console.error("Failed to encrypt data source password", error);
        return NextResponse.json({ error: "Server encryption key misconfigured" }, { status: 500 });
      }
    } else {
      passwordFields = {
        passwordCiphertext: null,
        passwordIv: null,
        passwordTag: null,
      };
    }
  }

  const host = type === "sqlite" ? null : (body.host || null);
  const port = type === "sqlite" ? null : (body.port ?? null);
  const database = body.database || null;
  const user = type === "sqlite" ? null : (body.user || null);

  const matchers = [
    name ? { AND: [{ type }, { name }] } : undefined,
    type === "sqlite" && database
      ? { AND: [{ type: "sqlite" }, { database }] }
      : undefined,
    (type === "postgres" || type === "mysql") && host && database
      ? { AND: [{ type }, { host }, { database }] }
      : undefined,
  ].filter(Boolean);

  const existing = await prisma.dataSource.findFirst({
    where: {
      orgId: org.id,
      ownerId: dbUser.id,
      ...(matchers.length ? { OR: matchers } : {}),
    },
  });

  const entitlements = await resolveOrgEntitlements(org.id);
  const maxSources = typeof entitlements.limits.maxSources === "number" ? entitlements.limits.maxSources : null;
  const countFn = (prisma.dataSource as any).count;
  if (!existing && maxSources && typeof countFn === "function") {
    const sourceCount = await countFn({ where: { orgId: org.id } });
    if (sourceCount >= maxSources) {
      return NextResponse.json(
        blockedEntitlementResponse("Additional data sources", entitlements, "pro"),
        { status: 403 }
      );
    }
  }

  const ds = existing
    ? await prisma.dataSource.update({
        where: { id: existing.id },
        data: {
          orgId: org.id,
          ownerId: dbUser.id,
          type,
          name: name || existing.name,
          host,
          port,
          database,
          user,
          ...(usesPassword ? passwordFields : {
            passwordCiphertext: null,
            passwordIv: null,
            passwordTag: null,
          }),
          metadata: type === "sqlite" ? null : existing.metadata,
          urlCiphertext: null,
          urlIv: null,
          urlTag: null,
        },
      })
    : await prisma.dataSource.create({
        data: {
          orgId: org.id,
          ownerId: dbUser.id,
          type,
          name: name || `${database}@${host}`,
          host,
          port,
          database,
          user,
          ...(usesPassword ? passwordFields : {}),
          urlCiphertext: null,
          urlIv: null,
          urlTag: null,
          metadata: null,
        },
      });

  await logAuditEvent({
    orgId: org.id,
    userId: dbUser.id,
    action: existing ? "datasource.scope_changed" : "datasource.connect",
    targetType: "datasource",
    targetId: ds.id,
    metadata: { type: ds.type, name: ds.name },
  });

  return NextResponse.json({ id: ds.id, orgId: ds.orgId, ownerId: ds.ownerId });
}
