import { describe, expect, it } from "vitest";
import { CHORD_TIMEOUT_MS, isDialogOpen, resolveChord, SHORTCUTS } from "@/lib/shortcuts";

describe("keyboard shortcuts", () => {
  it("maps every G-chord to an existing route", () => {
    const routes = ["/", "/cost-explorer", "/resources", "/security", "/kubernetes"];
    for (const s of SHORTCUTS.filter((x) => x.keys.startsWith("G "))) expect(routes).toContain(s.to);
  });
  it("resolves chords only within the timeout", () => {
    const t0 = 1_000;
    expect(resolveChord("o", t0, t0 + 100)).toBe("/");
    expect(resolveChord("C", t0, t0 + CHORD_TIMEOUT_MS - 1)).toBe("/cost-explorer");
    expect(resolveChord("r", t0, t0 + CHORD_TIMEOUT_MS + 1)).toBeNull();
    expect(resolveChord("o", null, t0)).toBeNull();
    expect(resolveChord("x", t0, t0 + 10)).toBeNull();
  });
  it("detects open dialogs so shortcuts pause (except Esc)", () => {
    const doc = document.implementation.createHTMLDocument();
    expect(isDialogOpen(doc)).toBe(false);
    const d = doc.createElement("div");
    d.setAttribute("role", "dialog");
    doc.body.appendChild(d);
    expect(isDialogOpen(doc)).toBe(true);
  });
  it("ignores shortcuts while typing in inputs", async () => {
    const { isEditableTarget } = await import("@/lib/shortcuts");
    const input = document.createElement("input");
    const div = document.createElement("div");
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(div)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
