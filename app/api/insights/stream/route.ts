import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { streamInsights } from "@/lib/insights";
import { z } from "zod";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { blockedEntitlementResponse, resolveOrgEntitlements } from "@/lib/entitlements";

const Body = z.object({
  question: z.string().min(1),
  sql: z.string().min(1),
  fields: z.array(z.string()),
  rows: z.array(z.record(z.unknown())),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const { org } = await ensureUserAndOrg(user);
  const entitlements = await resolveOrgEntitlements(org.id);
  if (!entitlements.features.weeklyReports) {
    return new Response(
      JSON.stringify(blockedEntitlementResponse("AI reporting insights", entitlements, "pro")),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamInsights(parsed.data)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message || "Stream failed" })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
