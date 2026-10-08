import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { PageHeader } from "@/components/finops/States";
import { RecommendationsWorkspace, type RecSearch } from "@/components/finops/Recommendations";

const defaults: RecSearch = { cat: "All", effort: "All", risk: "All", status: "All", sort: "savings-desc" };
const schema = z.object({
  cat: fallback(z.string(), "All").default("All"),
  effort: fallback(z.string(), "All").default("All"),
  risk: fallback(z.string(), "All").default("All"),
  status: fallback(z.string(), "All").default("All"),
  sort: fallback(z.enum(["savings-desc", "savings-asc"]), "savings-desc").default("savings-desc"),
});

export const Route = createFileRoute("/recommendations")({
  validateSearch: zodValidator(schema),
  search: { middlewares: [stripSearchParams(defaults)] },
  head: () => ({
    meta: [
      { title: "Recommendations — NimbusOps" },
      { name: "description", content: "Savings actions ranked by impact." },
      { property: "og:title", content: "Recommendations — NimbusOps" },
      { property: "og:description", content: "Savings actions ranked by impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/recommendations" });
  const setSearch = (p: Partial<RecSearch>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true, resetScroll: false });
  return (
    <>
      <PageHeader title="Recommendations" description="Savings actions ranked by impact" />
      <GlobalFilters />
      <RecommendationsWorkspace search={search} setSearch={setSearch} />
    </>
  );
}
