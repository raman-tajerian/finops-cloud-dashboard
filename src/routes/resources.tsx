import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { ResourcesWorkspace, type TableSearch } from "@/components/finops/ResourcesTable";

const defaults = { q: "", sort: "monthlyCost", dir: "desc", page: 1, size: 25, id: "", status: "All", service: "All" };
const schema = z.object({
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "monthlyCost").default("monthlyCost"),
  dir: fallback(z.string(), "desc").default("desc"),
  page: fallback(z.number(), 1).default(1),
  size: fallback(z.number(), 25).default(25),
  id: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "All").default("All"),
  service: fallback(z.string(), "All").default("All"),
});

export const Route = createFileRoute("/resources")({
  validateSearch: zodValidator(schema),
  search: { middlewares: [stripSearchParams(defaults)] },
  head: () => ({
    meta: [
      { title: "Resources — NimbusOps" },
      { name: "description", content: "Every cloud resource with cost, utilization, status and right-sizing suggestions." },
      { property: "og:title", content: "Resources — NimbusOps" },
      { property: "og:description", content: "Every cloud resource with cost, utilization, status and right-sizing suggestions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/resources" });
  const setSearch = (p: Partial<TableSearch>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true, resetScroll: false });
  return (
    <>
      <PageHeader title="Resources" description="Every cloud resource with cost, utilization and status" />
      <GlobalFilters />
      <CardBoundary label="Resource table"><ResourcesWorkspace search={search} setSearch={setSearch} /></CardBoundary>
    </>
  );
}
