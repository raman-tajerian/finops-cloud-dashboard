import { createFileRoute } from "@tanstack/react-router";
import { handleAnomalyAnalysis } from "@/lib/anomaly-analysis.server";

export const Route = createFileRoute("/api/anomaly-analysis")({
  server: { handlers: { POST: ({ request }) => handleAnomalyAnalysis(request) } },
});
