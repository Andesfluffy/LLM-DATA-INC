import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { requireOrgPermission } from "@/lib/rbac";
import { redactDataSourceSecrets } from "@/lib/datasourceSecrets";

export async function GET(req: NextRequest) {
  const authUser = await getUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });
  }

  const access = await requireOrgPermission(authUser, "settings:read");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user } = access;

  const dataSources = await prisma.dataSource.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { org: { memberships: { some: { userId: user.id } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    dataSources: dataSources.map((ds: any) => redactDataSourceSecrets(ds)),
  });
}
