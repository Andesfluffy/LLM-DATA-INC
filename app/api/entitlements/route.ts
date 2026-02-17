import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { resolveOrgEntitlements } from "@/lib/entitlements";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const { org } = await ensureUserAndOrg(user);
  const entitlements = await resolveOrgEntitlements(org.id);
  return NextResponse.json(entitlements);
}
