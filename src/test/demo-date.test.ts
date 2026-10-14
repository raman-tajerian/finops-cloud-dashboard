import { describe, expect, it } from "vitest";
import { dayAt, DEMO_TODAY, HISTORY_DAYS, masterResources, snoozeUntil } from "@/data/resources";

describe("demo date", () => {
  it("DEMO_TODAY is 2026-10-12", () => expect(DEMO_TODAY.toISOString().slice(0, 10)).toBe("2026-10-12"));
  it("no daily data point after DEMO_TODAY", () => {
    expect(dayAt(HISTORY_DAYS - 1).getTime()).toBe(DEMO_TODAY.getTime());
    for (const r of masterResources) expect(r.daily.length).toBe(HISTORY_DAYS);
  });
  it("snooze dates come from DEMO_TODAY, not the real clock", () => {
    expect(snoozeUntil(7)).toBe("2026-10-19");
    expect(snoozeUntil(30)).toBe("2026-11-11");
  });
});
