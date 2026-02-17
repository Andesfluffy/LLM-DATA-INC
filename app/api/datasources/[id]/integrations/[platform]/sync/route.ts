import { NextRequest, NextResponse } from "next/server";

import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg, findAccessibleDataSource } from "@/lib/userOrg";
import { syncIntegrationDataSource } from "@/src/server/integrations/ingestion";
import type { IntegrationPlatform } from "@/src/server/integrations/types";

type RouteContext = { params: Promise<{ id: string; platform: string }> };

function parsePlatform(input: string): IntegrationPlatform | null {
  return input === "stripe" || input === "shopify" ? input : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });
  const { user } = await ensureUserAndOrg(auth);
  const { id, platform: rawPlatform } = await context.params;
  const platform = parsePlatform(rawPlatform);
  if (!platform) return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });

  const ds = await findAccessibleDataSource({ userId: user.id, datasourceId: id });
  if (!ds) return NextResponse.json({ error: "Data source not found" }, { status: 404 });

  try {
    const result = await syncIntegrationDataSource(ds.id, platform);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
