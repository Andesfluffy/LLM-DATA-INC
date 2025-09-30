import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { encryptPassword } from "@/lib/datasourceSecrets";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const Body = z.object({ name: z.string().min(1), host: z.string().min(1), port: z.coerce.number().int().positive(), database: z.string().min(1), user: z.string().min(1), password: z.string().optional() });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;
  const { host, port, database, user, name } = body;
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

  // Ensure demo org exists with fixed id
  const demoOrgId = "demo-org";
  await prisma.org.upsert({
    where: { id: demoOrgId },
    update: {},
    create: { id: demoOrgId, name: "Demo Org" },
  });

  // Find existing DS for org by name or host/db pair
  const existing = await prisma.dataSource.findFirst({
    where: {
      orgId: demoOrgId,
      OR: [
        name ? { name } : undefined,
        { AND: [{ host }, { database }] },
      ].filter(Boolean) as any,
    },
  });

  const ds = existing
    ? await prisma.dataSource.update({
        where: { id: existing.id },
        data: {
          orgId: demoOrgId,
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
          orgId: demoOrgId,
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

  return NextResponse.json({ id: ds.id });
}
