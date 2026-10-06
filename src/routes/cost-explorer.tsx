import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { DataGate } from "@/lib/queries";
import { DenseKpis, DetailDrawer, type Detail } from "@/components/finops/Platform";
import { AnomalyForecast } from "@/components/finops/Insights";
import { CardBoundary, PageHeader, SectionHeading } from "@/components/finops/States";
import { CostExplorer, type ExplorerState, type SavedView } from "@/components/finops/Explorer";
import type { Filters } from "@/lib/filters";
import { useState } from "react";

const defaults = { group: "service", chart: "area", compare: false, views: "" } as const;
const schema = z.object({
  group: fallback(z.enum(["service", "provider", "region", "team", "environment", "tag"]), "service").default("service"),
  chart: fallback(z.enum(["area", "bar", "line"]), "area").default("area"),
  compare: fallback(z.boolean(), false).default(false),
  views: fallback(z.string(), "").default(""),
});

function decodeViews(raw: string): SavedView[] {
  if (!raw || raw.length > 6000) return [];
  try {
    const value: unknown = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is SavedView => typeof v === "object" && v !== null && typeof v.name === "string" && typeof v.state === "object" && v.state !== null && typeof v.filters === "object" && v.filters !== null).slice(-8);
  } catch { return []; }
}

export const Route = createFileRoute("/cost-explorer")({
  validateSearch: zodValidator(schema),
  search: { middlewares: [stripSearchParams(defaults)] },
  head: () => ({
    meta: [
      { title: "Cost Explorer — NimbusOps" },
      { name: "description", content: "Group spend by service, provider, region, team, environment or tag and compare with the previous period." },
      { property: "og:title", content: "Cost Explorer — NimbusOps" },
      { property: "og:description", content: "Group spend by service, provider, region, team, environment or tag and compare with the previous period." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CostExplorerPage,
});

function CostExplorerPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/cost-explorer" });
  const [detail, setDetail] = useState<Detail>(null);
  const setState = (p: Partial<ExplorerState>, f?: Filters) => navigate({ search: (prev) => ({ ...prev, ...(f ?? {}), ...p }), replace: true, resetScroll: false });
  const views = decodeViews(s.views);
  const setViews = (next: SavedView[]) => navigate({ to: ".", search: (prev) => ({ ...prev, views: encodeURIComponent(JSON.stringify(next)) }), replace: true, resetScroll: false });
  return (
    <>
      <PageHeader title="Cost Explorer" description="Slice spend any way you need and compare it with the previous period" />
      <GlobalFilters />
      <CardBoundary label="Cost explorer"><CostExplorer state={s} views={views} setViews={setViews} setState={setState} /></CardBoundary>
      <SectionHeading title="Spend details" description="Breakdown cards — click one for the full detail" />
      <DataGate h="h-16"><DenseKpis onOpen={setDetail} /></DataGate>
      <DataGate h="h-64"><AnomalyForecast /></DataGate>
      <DetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}
