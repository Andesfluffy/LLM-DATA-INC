import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { org, user } = await ensureUserAndOrg(auth);
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

  const notifications = await prisma.inAppNotification.findMany({
    where: {
      orgId: org.id,
      recipient: user.email || user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unreadCount = await prisma.inAppNotification.count({
    where: {
      orgId: org.id,
      recipient: user.email || user.id,
      readAt: null,
    },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { org, user } = await ensureUserAndOrg(auth);
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids : [];

  if (ids.length > 0) {
    await prisma.inAppNotification.updateMany({
      where: {
        id: { in: ids },
        orgId: org.id,
        recipient: user.email || user.id,
      },
      data: { readAt: new Date() },
    });
  } else {
    await prisma.inAppNotification.updateMany({
      where: {
        orgId: org.id,
        recipient: user.email || user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
