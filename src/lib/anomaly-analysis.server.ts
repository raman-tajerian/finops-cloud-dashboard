import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { platformKpis, byService, byRegion, recommendations, cluster } from "@/lib/finops-platform-data";
import { resources } from "@/lib/finops-data";
import { forecast } from "@/lib/finops-insights-data";

const MODEL = "openai/gpt-6-astra";
const RUN = "X-Lovable-AIG-Run-ID";
const Body = z.object({ anomalyId: z.string().max(40), note: z.string().max(500).optional() });

export async function handleAnomalyAnalysis(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const anomaly = platformKpis.anomalies.find((a) => a.id === parsed.data.anomalyId);
  if (!anomaly) return Response.json({ error: "Unknown anomaly" }, { status: 404 });
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return Response.json({ error: "AI is not configured" }, { status: 401 });

  let runId = request.headers.get(RUN)?.trim() || undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const h = new Headers(init?.headers);
      if (runId) h.set(RUN, runId);
      const res = await fetch(input, { ...init, headers: h });
      runId ??= res.headers.get(RUN)?.trim() || undefined;
      return res;
    },
  });

  const context = {
    anomaly,
    otherAnomalies: platformKpis.anomalies.filter((a) => a.id !== anomaly.id),
    spend: platformKpis.spend, waste: platformKpis.waste, costByService: byService, costByRegion: byRegion,
    resources, openRecommendations: recommendations, kubernetes: cluster,
    dailyForecastVsActual: forecast.filter((d) => d.actual !== null).map((d) => ({ day: d.day, forecast: d.forecast, actual: d.actual, band: d.band })),
  };

  const result = streamText({
    model: provider.responses(MODEL),
    abortSignal: request.signal,
    system: "You are a senior FinOps analyst. Analyze the cost anomaly using ONLY the provided JSON data. Respond in English, concise markdown, max ~300 words, with exactly these sections: '## Likely causes' (ranked, each with confidence High/Medium/Low and the evidence from the data), '## Prioritized actions' (numbered, each with owner team, estimated monthly saving in USD and effort), '## What to verify next'. Never invent resources not in the data; say when data is insufficient.",
    prompt: `Cost & resource data:\n${JSON.stringify(context)}\n\nAnalyst note: ${parsed.data.note || "(none)"}`,
    providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
  });

  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(c) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") c.enqueue(enc.encode(part.text));
          else if (part.type === "error") throw part.error;
        }
      } catch (e) {
        if (!request.signal.aborted) {
          const status = (e as { statusCode?: number })?.statusCode;
          const msg = status === 429 ? "Too many requests — try again in a minute." : status === 402 ? "AI credits are used up. Add credits in Settings → Plans & credits." : status === 403 ? "AI access is blocked for this workspace." : "The analysis failed. Please try again.";
          c.enqueue(enc.encode(`\n\n[[ERROR]]${msg}`));
        }
      }
      c.close();
    },
  });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
