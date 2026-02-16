import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";

export async function GET(req: NextRequest) {
  const authUser = await getUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const { user: dbUser, org } = await ensureUserAndOrg(authUser);

  const datasourceCount = await prisma.dataSource.count({
    where: {
      OR: [
        { ownerId: dbUser.id },
        { orgId: org.id },
      ],
    },
  });

  // Return both legacy and current field names for client compatibility.
  return NextResponse.json({
    onboardingComplete: dbUser.onboardingComplete,
    datasourceCount,
    complete: dbUser.onboardingComplete,
    hasDataSources: datasourceCount > 0,
  });
}

export async function PUT(req: NextRequest) {
  const authUser = await getUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const { user: dbUser } = await ensureUserAndOrg(authUser);
  const body = await req.json();

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { onboardingComplete: body.complete === true },
  });

  return NextResponse.json({ ok: true });
}
