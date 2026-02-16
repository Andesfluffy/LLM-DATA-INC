import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { redactDataSourceSecrets } from "@/lib/datasourceSecrets";

export async function GET(req: NextRequest) {
  const authUser = await getUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });
  }

  const { user } = await ensureUserAndOrg(authUser);

  const dataSources = await prisma.dataSource.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { org: { users: { some: { id: user.id } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    dataSources: dataSources.map((ds: any) => redactDataSourceSecrets(ds)),
  });
}
