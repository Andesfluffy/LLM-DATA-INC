import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUser, findAccessibleDataSource } from "@/lib/userOrg";
import { getPersistedDatasourceScope } from "@/lib/datasourceScope";
import { getConnector } from "@/lib/connectors/registry";
import { parseCompactSchema } from "@/lib/schemaParser";

import "@/lib/connectors/init";

export async function GET(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const datasourceId = searchParams.get("datasourceId");

  if (!datasourceId) {
    return NextResponse.json({ error: "datasourceId is required" }, { status: 400 });
  }

  const { user: dbUser } = await ensureUser(userAuth);
  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId });
  if (!ds) return NextResponse.json({ error: "Data source not found" }, { status: 404 });

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);

  try {
    const scopedTables = await getPersistedDatasourceScope(ds.id);
    const schemaKey = `${ds.id}:${ds.type}`;
    const ddl = await client.getSchema({ cacheKey: schemaKey });
    const tables = parseCompactSchema(ddl);
    return NextResponse.json({ tables, scopedTables });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch schema info" },
      { status: 500 }
    );
  } finally {
    await client.disconnect();
  }
}
