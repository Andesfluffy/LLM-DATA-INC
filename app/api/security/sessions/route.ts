import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user: dbUser } = await ensureUserAndOrg(user);
  const sessions = await prisma.session.findMany({
    where: { userId: dbUser.id },
    orderBy: { expires: "desc" },
    select: { id: true, expires: true, userAgent: true, ipAddress: true, deviceName: true, lastSeenAt: true, revokedAt: true },
  });

  return NextResponse.json({ sessions });
}
