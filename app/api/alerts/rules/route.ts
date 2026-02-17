import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { createAlertRule, listAlertRules } from "@/lib/alerts/service";

const createSchema = z.object({
  metric: z.string().min(1),
  threshold: z.number(),
  cooldownMinutes: z.number().int().positive(),
  recipients: z.array(z.string().min(1)).min(1),
  channel: z.enum(["EMAIL", "IN_APP"]),
});

export async function GET(request: NextRequest) {
  const auth = await getUserFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { org } = await ensureUserAndOrg(auth);
  const rules = await listAlertRules(org.id);
  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  const auth = await getUserFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { org } = await ensureUserAndOrg(auth);
  const rule = await createAlertRule({
    orgId: org.id,
    ...parsed.data,
  });

  return NextResponse.json(rule, { status: 201 });
}
