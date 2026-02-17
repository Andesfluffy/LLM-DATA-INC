import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg, findAccessibleDataSource } from "@/lib/userOrg";
import { prisma } from "@/lib/db";
import { encryptIntegrationSecret, type IntegrationPlatform } from "@/src/server/integrations/types";
import { getIntegrationsFromMetadata, redactIntegrationConfig, withIntegrationMetadata } from "@/src/server/integrations/metadata";

type RouteContext = { params: Promise<{ id: string; platform: string }> };

const BodySchema = z.object({
  mode: z.enum(["api_key", "oauth"]),
  apiKey: z.string().optional(),
  oauth: z
    .object({
      accessToken: z.string().min(1),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
    })
    .optional(),
});

function parsePlatform(input: string): IntegrationPlatform | null {
  return input === "stripe" || input === "shopify" ? input : null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });
  const { user } = await ensureUserAndOrg(auth);
  const { id, platform: rawPlatform } = await context.params;
  const platform = parsePlatform(rawPlatform);
  if (!platform) return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });

  const ds = await findAccessibleDataSource({ userId: user.id, datasourceId: id });
  if (!ds) return NextResponse.json({ error: "Data source not found" }, { status: 404 });

  const integration = getIntegrationsFromMetadata(ds.metadata)[platform];
  return NextResponse.json({
    integration: integration ? redactIntegrationConfig(integration) : null,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });
  const { user } = await ensureUserAndOrg(auth);
  const { id, platform: rawPlatform } = await context.params;
  const platform = parsePlatform(rawPlatform);
  if (!platform) return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });

  const bodyParse = BodySchema.safeParse(await req.json());
  if (!bodyParse.success) return NextResponse.json({ error: bodyParse.error.flatten() }, { status: 400 });

  const body = bodyParse.data;
  if (body.mode === "api_key" && !body.apiKey) {
    return NextResponse.json({ error: "apiKey is required for API key mode" }, { status: 400 });
  }
  if (body.mode === "oauth" && !body.oauth?.accessToken) {
    return NextResponse.json({ error: "oauth.accessToken is required for OAuth mode" }, { status: 400 });
  }

  const ds = await findAccessibleDataSource({ userId: user.id, datasourceId: id });
  if (!ds) return NextResponse.json({ error: "Data source not found" }, { status: 404 });

  const encryptedSecret = encryptIntegrationSecret(
    body.mode === "api_key" ? { apiKey: body.apiKey } : { oauth: body.oauth },
  );

  const metadata = withIntegrationMetadata(ds.metadata, platform, {
    platform,
    mode: body.mode,
    encryptedSecret,
    sync: {
      status: "idle",
      error: null,
    },
  });

  const updated = await prisma.dataSource.update({
    where: { id: ds.id },
    data: { metadata },
  });

  const integration = getIntegrationsFromMetadata(updated.metadata)[platform];
  return NextResponse.json({ integration: integration ? redactIntegrationConfig(integration) : null });
}
