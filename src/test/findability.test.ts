import { describe, expect, it, vi } from "vitest";
import { masterResources } from "@/data/resources";
import { buildDashboard } from "@/data/aggregate";
import { buildSecurity, isOpenFinding } from "@/data/security";
import { defaultFilters, type Filters } from "@/lib/filters";
import { fuzzyMatch, navigationCounts, searchTargets } from "@/lib/findability";
import { emptyNavigation, recordSearch, recordVisit, togglePin } from "@/lib/session-store";

const combos: Filters[] = [defaultFilters, { ...defaultFilters, range: "7d", providers: ["AWS"] }, { ...defaultFilters, env: "Production", team: "Data" }, { ...defaultFilters, range: "q3", providers: ["Azure", "GCP"] }];
describe("navigation counts", () => {
  it.each(combos)("equals existing aggregates for %o", (filters) => {
    const d = buildDashboard(masterResources, filters); const sec = buildSecurity(masterResources, filters);
    const counts = navigationCounts(d, sec);
    expect(counts["/recommendations"]).toBe(d.recommendations.length);
    expect(counts["/security"]).toBe(sec.findings.filter((f) => isOpenFinding(f.status)).length);
    expect(counts["/budgets"]).toBe(d.overview.anomalies.value);
  });
  it("overlays recommendation and finding session changes", () => {
    const d = buildDashboard(masterResources, defaultFilters); const sec = buildSecurity(masterResources, defaultFilters);
    const rec = d.recommendations[0]; const finding = sec.findings.find((f) => isOpenFinding(f.status));
    if (!rec || !finding) throw new Error("Expected populated demo");
    const counts = navigationCounts(d, sec, { [rec.id]: { status: "Done" } }, { [finding.id]: { status: "Resolved" } });
    expect(counts["/recommendations"]).toBe(d.recommendations.length - 1);
    expect(counts["/security"]).toBe(sec.findings.filter((f) => isOpenFinding(f.status)).length - 1);
  });
});
describe("palette matching", () => {
  const d = buildDashboard(masterResources, defaultFilters); const targets = searchTargets(d, buildSecurity(masterResources, defaultFilters));
  it("finds pages with fuzzy matching", () => {
    expect(targets.filter((t) => t.group === "Pages" && fuzzyMatch(t.label, "cst explr")).map((t) => t.to)).toContain("/cost-explorer");
    expect(fuzzyMatch("Resources", "resouces")).toBeGreaterThan(0);
  });
  it("finds tabs independently", () => {
    expect(targets.filter((t) => t.group === "Tabs" && fuzzyMatch(t.label, "unit economics")).some((t) => t.tab === "unit-economics")).toBe(true);
  });
  it("finds resources and opens the exact resource", () => {
    const r = d.resources[0]; if (!r) throw new Error("Expected resource");
    expect(targets.find((t) => t.group === "Resources" && fuzzyMatch(t.label, r.name))?.search?.["id"]).toBe(r.id);
    expect(fuzzyMatch(r.name, "totally-unrelated-search-xyz")).toBe(0);
  });
});
describe("session-only navigation", () => {
  it("pins page and tab independently and toggles each off", () => {
    const page = { to: "/", label: "Overview" }; const tab = { ...page, tab: "carbon" };
    const n = togglePin(togglePin(emptyNavigation(), page), tab);
    expect(n.pinned).toHaveLength(2);
    expect(togglePin(n, page).pinned).toEqual([tab]);
  });
  it("keeps the last four distinct pages in order", () => {
    let n = emptyNavigation();
    for (const to of ["/", "/resources", "/security", "/budgets", "/reports", "/resources"]) n = recordVisit(n, { to, label: to });
    expect(n.recent.map((t) => t.to)).toEqual(["/resources", "/reports", "/budgets", "/security"]);
  });
  it("deduplicates recent searches and never writes durable storage", () => {
    const local = vi.spyOn(Storage.prototype, "setItem");
    const n = recordSearch(recordSearch(emptyNavigation(), "carbon"), "carbon");
    expect(n.searches).toEqual(["carbon"]);
    expect(emptyNavigation()).toEqual({ pinned: [], recent: [], searches: [], collapsed: {} });
    expect(local).not.toHaveBeenCalled(); local.mockRestore();
  });
});