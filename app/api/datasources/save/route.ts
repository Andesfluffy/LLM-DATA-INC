import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { encryptPassword } from "@/lib/datasourceSecrets";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { getConnector } from "@/lib/connectors/registry";
import "@/lib/connectors/init";
import { z } from "zod";

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
  });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const body = parsed.data;
  const { name, type } = body;

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

  const { user: dbUser, org } = await ensureUserAndOrg(userAuth);
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

  return NextResponse.json({ id: ds.id, orgId: ds.orgId, ownerId: ds.ownerId });
}
