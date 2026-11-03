import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { masterResources } from "@/data/resources";
import { buildDashboard } from "@/data/aggregate";
import { buildBudget } from "@/data/platformOps";
import { defaultFilters, type Filters } from "@/lib/filters";
import { reducedMotionMode } from "@/lib/motion";
import { setSession, useSession } from "@/lib/session-store";
import { CardBoundary } from "@/components/finops/States";
import { renderHook, act } from "@testing-library/react";

// "custom" is the 30-day window (windowOf falls back to 30 days for it).
const ranges: Filters["range"][] = ["7d", "custom", "mtd"];

describe("budget spendToDate reconciles with Overview", () => {
  it.each(ranges)("spendToDate equals the Overview total for range %s", (range) => {
    const f: Filters = { ...defaultFilters, range };
    expect(buildBudget(masterResources, f).spendToDate).toBeCloseTo(buildDashboard(masterResources, f).overview.totalSpend.value, 6);
  });
  it("defaultBudget comes from the aggregate (105% of Q3 ÷ 3), not a constant", () => {
    const b = buildBudget(masterResources, defaultFilters);
    expect(b.defaultBudget).toBe(Math.round((b.previousQuarterSpend / 3) * 1.05));
    expect(b.defaultBudget).toBeGreaterThan(0);
  });
});

/* ---------- Source scans: no leftovers ---------- */
const SRC = path.resolve(__dirname, "..");
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((e) => {
    const p = path.join(dir, e);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(ts|tsx|css)$/.test(e) ? [p] : [];
  });
const allSource = sourceFiles(SRC)
  .filter((p) => !p.endsWith("audit-fixes.test.tsx")) // this file contains the search strings themselves
  .map((p) => ({ file: path.relative(SRC, p), text: readFileSync(p, "utf8") }));

describe("no hard-coded leftovers in src", () => {
  it("no file references DATA_END_DATE", () => {
    expect(allSource.filter((f) => f.text.includes("DATA_END_DATE")).map((f) => f.file)).toEqual([]);
  });
  it("no hard-coded 300_000 / 300000 budget figure remains", () => {
    expect(allSource.filter((f) => /300_000|300000/.test(f.text)).map((f) => f.file)).toEqual([]);
  });
  it("the six workspace routes wrap their view in CardBoundary", () => {
    for (const r of ["recommendations", "security", "sustainability", "reports", "integrations", "settings"]) {
      const text = readFileSync(path.join(SRC, "routes", `${r}.tsx`), "utf8");
      expect(text, r).toMatch(/<CardBoundary[^>]*>/);
    }
  });
});

/* ---------- Reduce motion ---------- */
describe("reduce motion setting", () => {
  it("maps the switch to the root MotionConfig mode", () => {
    expect(reducedMotionMode(false)).toBe("user");
    expect(reducedMotionMode(true)).toBe("always");
  });
  it("is off by default and the switch updates session state", () => {
    const { result } = renderHook(() => useSession((s) => s.settings.reduceMotion));
    expect(result.current).toBe(false);
    act(() => setSession((s) => ({ ...s, settings: { ...s.settings, reduceMotion: true } })));
    expect(result.current).toBe(true);
    expect(reducedMotionMode(result.current)).toBe("always");
    act(() => setSession((s) => ({ ...s, settings: { ...s.settings, reduceMotion: false } })));
  });
});

/* ---------- Error containment ---------- */
const Boom = (): never => {
  throw new Error("forced demo failure");
};

describe("CardBoundary contains a forced error", () => {
  it("shows the retry card instead of crashing, and Retry resets", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let fail = true;
    const MaybeBoom = () => {
      if (fail) Boom();
      return <p>card content</p>;
    };
    render(
      <CardBoundary label="Test card">
        <MaybeBoom />
      </CardBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Test card failed to render. Try again.");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("card content")).toBeInTheDocument();
    spy.mockRestore();
  });
});
