import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest, getOrCreateUserOrg } from "@/lib/auth-server";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const Body = z.object({ name: z.string().min(1), host: z.string().min(1), port: z.coerce.number().int().positive(), database: z.string().min(1), user: z.string().min(1), password: z.string().optional() });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { host, port, database, user, password, name } = parsed.data;
  const { user: appUser, org } = await getOrCreateUserOrg(userAuth.uid, userAuth.email);

  const existing = await prisma.dataSource.findFirst({
    where: {
      orgId: org.id,
      ownerId: appUser.id,
      OR: [
        name ? { name } : undefined,
        { AND: [{ host }, { database }] },
      ].filter(Boolean) as any,
    },
  });

  const connectionUrl = buildPgUrl({ host, port, database, user, password });

  const ds = existing
    ? await prisma.dataSource.update({
        where: { id: existing.id },
        data: {
          orgId: org.id,
          ownerId: appUser.id,
          type: "postgres",
          name: name || existing.name,
          host,
          port: Number(port),
          database,
          user,
          password,
          url: connectionUrl,
        },
      })
    : await prisma.dataSource.create({
        data: {
          orgId: org.id,
          ownerId: appUser.id,
          type: "postgres",
          name: name || `${database}@${host}`,
          host,
          port: Number(port),
          database,
          user,
          password,
          url: connectionUrl,
        },
      });

  return NextResponse.json({ id: ds.id, orgId: org.id });
}

function buildPgUrl(p: { host: string; port: number | string; database: string; user: string; password?: string }) {
  const enc = encodeURIComponent;
  const pwd = p.password ? `:${enc(p.password)}` : "";
  return `postgresql://${enc(p.user)}${pwd}@${p.host}:${p.port}/${p.database}`;
}
