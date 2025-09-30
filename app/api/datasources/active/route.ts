import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserOrgFromRequest } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const context = await getUserOrgFromRequest(req);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user, org } = context;
  const datasource = await prisma.dataSource.findFirst({
    where: { orgId: org.id, ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    org: { id: org.id, name: org.name },
    user: { id: user.id, email: user.email, name: user.name },
    datasource: datasource
      ? {
          id: datasource.id,
          name: datasource.name,
          type: datasource.type,
          host: datasource.host,
          port: datasource.port,
          database: datasource.database,
          user: datasource.user,
        }
      : null,
  });
}
