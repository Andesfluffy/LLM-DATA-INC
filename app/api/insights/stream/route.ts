import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { checkRateLimit, checkAiDailyLimit } from "@/lib/rateLimit";
import { streamInsights } from "@/lib/insights";
import { z } from "zod";

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

  // 10 insight streams per minute per user
  const rl = await checkRateLimit(`insights:${user.uid}`, 10, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: `Too many requests. Please wait ${Math.ceil(rl.retryAfterMs / 1000)} seconds.` }),
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const daily = await checkAiDailyLimit(user.uid);
  if (!daily.ok) {
    return new Response(
      JSON.stringify({ error: "You've reached your daily query limit. Please try again tomorrow." }),
      { status: 429 }
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamInsights(parsed.data)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream failed" })}\n\n`));
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
