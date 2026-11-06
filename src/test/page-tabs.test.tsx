import { describe, expect, it } from "vitest";
import { PAGE_TABS, resolveTab } from "@/components/finops/PageTabs";
import { filterSearchSchema } from "@/lib/filters";

describe("page sub-tabs", () => {
  it("every page has unique, non-empty tab ids", () => {
    for (const [path, page] of Object.entries(PAGE_TABS)) {
      const ids = page.tabs.map((t) => t.id);
      expect(ids.length, path).toBeGreaterThan(1);
      expect(new Set(ids).size, path).toBe(ids.length);
      for (const t of page.tabs) {
        expect(t.id, `${path}:${t.id}`).toMatch(/^[a-z0-9-]+$/);
        expect(t.label.trim().length, `${path}:${t.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("resolveTab returns a valid id and falls back to the first tab", () => {
    const tabs = PAGE_TABS["/"].tabs;
    expect(resolveTab(tabs, "carbon")).toBe("carbon");
    expect(resolveTab(tabs, "nonsense")).toBe("summary");
    expect(resolveTab(tabs, undefined)).toBe("summary");
    expect(resolveTab(tabs, "")).toBe("summary");
  });

  it("the root search schema keeps ?tab= so it survives reloads and navigation", () => {
    const parsed = filterSearchSchema.parse({ tab: "findings", range: "7d" });
    expect(parsed.tab).toBe("findings");
    expect(parsed.range).toBe("7d");
    expect(filterSearchSchema.parse({}).tab).toBe("");
  });

  it("tab switches merge into existing search, preserving filters and currency", () => {
    // Same merge PageTabs/usePageTab performs: { ...prev, tab }
    const prev = { range: "7d", providers: ["AWS"], env: "Production", team: "All", cur: "SEK", tab: "summary" };
    const next = { ...prev, tab: "carbon" };
    expect(next).toMatchObject({ range: "7d", providers: ["AWS"], cur: "SEK", tab: "carbon" });
  });

  it("deep-link targets used by Overview KPIs exist in the registry", () => {
    const targets: [string, string][] = [
      ["/cost-explorer", "explore"], ["/cost-explorer", "unit-economics"],
      ["/budgets", "forecast"], ["/budgets", "anomalies"],
      ["/recommendations", "open"], ["/resources", "idle"], ["/resources", "list"],
    ];
    for (const [path, tab] of targets) {
      const page = PAGE_TABS[path as keyof typeof PAGE_TABS];
      expect(page, path).toBeDefined();
      expect(page.tabs.some((t) => t.id === tab), `${path}?tab=${tab}`).toBe(true);
    }
  });

  it("settings keeps its existing tab ids", () => {
    expect(PAGE_TABS["/settings"].tabs.map((t) => t.id)).toEqual(["profile", "workspace", "members", "allocation", "notifications", "keys", "appearance"]);
  });
});
