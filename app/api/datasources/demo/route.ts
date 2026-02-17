import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { createDemoDataSource } from "@/lib/demo-datasource";
import { blockedEntitlementResponse, resolveOrgEntitlements } from "@/lib/entitlements";

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth)
    return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const { user: dbUser, org } = await ensureUserAndOrg(userAuth);
  const entitlements = await resolveOrgEntitlements(org.id);
  if (!entitlements.features.liveDb) {
    return NextResponse.json(
      blockedEntitlementResponse("Live demo databases", entitlements, "pro"),
      { status: 403 }
    );
  }

  try {
    const ds = await createDemoDataSource(dbUser.id, org.id);
    return NextResponse.json({ id: ds.id, orgId: ds.orgId, ownerId: ds.ownerId });
  } catch (error: any) {
    console.error("Failed to create demo datasource", error);
    return NextResponse.json(
      { error: error?.message || "Failed to set up demo data source" },
      { status: 500 },
    );
  }
}
