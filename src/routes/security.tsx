import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { filterSearchSchema } from "@/lib/filters";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { PageHeader } from "@/components/finops/States";
import { SecurityWorkspace, type SecSearch } from "@/components/finops/Security";

const defaults: SecSearch = { sev: "All", fstatus: "All", prov: "All", rule: "All", q: "", sort: "sev-asc", finding: "" };
const schema = z.object({
  sev: fallback(z.string(), "All").default("All"),
  fstatus: fallback(z.string(), "All").default("All"),
  prov: fallback(z.string(), "All").default("All"),
  rule: fallback(z.string(), "All").default("All"),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "sev-asc").default("sev-asc"),
  finding: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/security")({
  validateSearch: zodValidator(schema),
  search: { middlewares: [stripSearchParams<z.infer<typeof schema> & z.infer<typeof filterSearchSchema>>(defaults)] },
  head: () => ({
    meta: [
      { title: "Security & Compliance — Fern" },
      { name: "description", content: "Fern — Multi-cloud cost and sustainability dashboard. Findings and compliance posture across clouds." },
      { property: "og:title", content: "Security & Compliance — Fern" },
      { property: "og:description", content: "Fern — Multi-cloud cost and sustainability dashboard. Findings and compliance posture across clouds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/security" });
  const setSearch = (p: Partial<SecSearch>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true, resetScroll: false });
  return (
    <>
      <PageHeader title="Security & Compliance" description="Findings and compliance posture across clouds" />
      <GlobalFilters />
      <SecurityWorkspace search={search} setSearch={setSearch} />
    </>
  );
}
