import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { encryptPassword } from "@/lib/datasourceSecrets";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const Body = z.object({ name: z.string().min(1), host: z.string().min(1), port: z.coerce.number().int().positive(), database: z.string().min(1), user: z.string().min(1), password: z.string().optional() });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;
  const { host, port, database, user, name } = body;
  const { user: dbUser, org } = await ensureUserAndOrg(userAuth);
  const hasPassword = Object.prototype.hasOwnProperty.call(body, "password");
  const password = hasPassword ? body.password : undefined;

  let passwordFields: Partial<Record<string, string | null>> = {};
  if (hasPassword) {
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

  const matchers = [
    name ? { name } : undefined,
    host && database ? { AND: [{ host }, { database }] } : undefined,
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
          type: "postgres",
          name: name || existing.name,
          host,
          port: Number(port),
          database,
          user,
          ...passwordFields,
          urlCiphertext: null,
          urlIv: null,
          urlTag: null,
        },
      })
    : await prisma.dataSource.create({
        data: {
          orgId: org.id,
          ownerId: dbUser.id,
          type: "postgres",
          name: name || `${database}@${host}`,
          host,
          port: Number(port),
          database,
          user,
          ...passwordFields,
          urlCiphertext: null,
          urlIv: null,
          urlTag: null,
        },
      });

  return NextResponse.json({ id: ds.id, orgId: ds.orgId, ownerId: ds.ownerId });
}
