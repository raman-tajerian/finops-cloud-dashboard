import { useNavigate, useSearch } from "@tanstack/react-router";
import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import type { CloudId, Env, PlatformRange } from "@/lib/finops-platform-data";

export type Team = "Platform" | "Data" | "FinOps" | "Media";
export interface Filters { range: PlatformRange; providers: CloudId[]; env: Env | "All"; team: Team | "All" }

export const allProviders: CloudId[] = ["AWS", "Azure", "GCP"];
export const teams: Team[] = ["Platform", "Data", "FinOps", "Media"];
export const defaultFilters: Filters = { range: "mtd", providers: allProviders, env: "All", team: "All" };

// URL schema (lenient; values are clamped in normalize()).
export const filterSearchSchema = z.object({
  range: fallback(z.string(), "mtd").default("mtd"),
  providers: fallback(z.string().array(), allProviders).default(allProviders),
  env: fallback(z.string(), "All").default("All"),
  team: fallback(z.string(), "All").default("All"),
});

export function normalizeFilters(s: { range?: string; providers?: string[]; env?: string; team?: string }): Filters {
  const range = (["7d", "mtd", "q3", "custom"] as const).find((r) => r === s.range) ?? "mtd";
  const providers = allProviders.filter((p) => s.providers?.includes(p));
  const env = (["Production", "Staging", "Development"] as const).find((e) => e === s.env) ?? "All";
  const team = teams.find((t) => t === s.team) ?? "All";
  return { range, providers: providers.length ? providers : allProviders, env, team };
}

/** Reads and writes the global filters stored in the URL query string. */
export function useGlobalFilters() {
  const search = useSearch({ strict: false }) as { range?: string; providers?: string[]; env?: string; team?: string };
  const navigate = useNavigate();
  const filters = normalizeFilters(search);
  const setFilters = (f: Filters) => navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, ...f }), replace: true, resetScroll: false } as never);
  return { filters, setFilters, reset: () => setFilters(defaultFilters) };
}

export const isDefault = (f: Filters) => f.range === "mtd" && f.providers.length === 3 && f.env === "All" && f.team === "All";
