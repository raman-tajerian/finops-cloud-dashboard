// Typed API client. Uses the seeded master dataset unless VITE_API_BASE_URL is set, then calls GET {base}/api/v1/...
import { masterResources } from "@/data/resources";
import { buildDashboard, buildExplore, buildResourceDetail, buildResources, buildSustainability } from "@/data/aggregate";
import type { Filters } from "@/lib/filters";
import type { DashboardDto, ExploreDto, GroupBy, ResourceDetailDto, ResourcesDto, SustainabilityDto } from "@/types/finops";

const base = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "");
export const dataSource: "live" | "demo" = base ? "live" : "demo";

const delay = () => new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
const qs = (f: Filters, extra: Record<string, string> = {}) => new URLSearchParams({ range: f.range, providers: f.providers.join(","), env: f.env, team: f.team, ...extra }).toString();

async function call<T>(path: string, mock: () => T): Promise<T> {
  if (!base) { await delay(); return mock(); }
  const res = await fetch(`${base}/api/v1${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const api = {
  getDashboard: (f: Filters) => call<DashboardDto>(`/dashboard?${qs(f)}`, () => buildDashboard(masterResources, f)),
  getExplore: (f: Filters, groupBy: GroupBy) => call<ExploreDto>(`/costs/explore?${qs(f, { groupBy })}`, () => buildExplore(masterResources, f, groupBy)),
  getResources: (f: Filters) => call<ResourcesDto>(`/resources?${qs(f)}`, () => buildResources(masterResources, f)),
  getResource: (id: string) => call<ResourceDetailDto | null>(`/resources/${encodeURIComponent(id)}`, () => buildResourceDetail(masterResources, id)),
  getSustainability: (f: Filters) => call<SustainabilityDto>(`/sustainability?${qs(f)}`, () => buildSustainability(masterResources, f)),
};
