import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg, findAccessibleDataSource } from "@/lib/userOrg";
import { getConnector } from "@/lib/connectors/registry";
import { parseCompactSchema } from "@/lib/schemaParser";
import { blockedEntitlementResponse, resolveOrgEntitlements } from "@/lib/entitlements";
import "@/lib/connectors/init";

export async function GET(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const datasourceId = searchParams.get("datasourceId");

  if (!orgId || !datasourceId) {
    return NextResponse.json({ error: "orgId and datasourceId are required" }, { status: 400 });
  }

  const { user: dbUser } = await ensureUserAndOrg(userAuth);
  const entitlements = await resolveOrgEntitlements(orgId);
  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId, orgId });
  if (!ds) return NextResponse.json({ error: "Data source not found" }, { status: 404 });

  if (ds.type !== "csv" && !entitlements.features.liveDb) {
    return NextResponse.json(
      blockedEntitlementResponse("Live database schema inspection", entitlements, "pro"),
      { status: 403 }
    );
  }

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);

  try {
    const schemaKey = `${ds.id}:${ds.type}`;
    const ddl = await client.getSchema(schemaKey);
    const tables = parseCompactSchema(ddl);
    return NextResponse.json({ tables });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch schema info" },
      { status: 500 }
    );
  } finally {
    await client.disconnect();
  }
}
