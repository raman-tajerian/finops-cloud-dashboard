import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnimatedNumber, ProgressRing } from "@/components/motion";
import { MOTION, pageExit } from "@/lib/motion";
import { fmtMoney, setActiveCurrency } from "@/data/currency";
import { setSession } from "@/lib/session-store";

const visibleText = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]')?.textContent ?? "";

afterEach(() => {
  act(() => {
    setActiveCurrency("USD");
    setSession((s) => ({ ...s, settings: { ...s.settings, reduceMotion: false } }));
  });
});

describe("Motion v2 numbers and rings", () => {
  it("AnimatedNumber finishes on the exact new value", async () => {
    const format = (n: number) => `$${Math.round(n)}`;
    const { container, rerender } = render(<AnimatedNumber value={100} format={format} />);
    expect(visibleText(container)).toBe("$100");
    rerender(<AnimatedNumber value={250} format={format} />);
    await waitFor(() => expect(visibleText(container)).toBe("$250"), { timeout: 1600 });
  });

  it("AnimatedNumber finishes on the exact formatted value after a currency change", async () => {
    const { container } = render(<AnimatedNumber value={100} format={fmtMoney} />);
    expect(visibleText(container)).toBe("$100");
    act(() => setActiveCurrency("EUR"));
    await waitFor(() => expect(visibleText(container)).toBe("€92"), { timeout: 1600 });
  });

  it("ProgressRing ends on the exact number and stroke offset", async () => {
    const { container } = render(<ProgressRing value={62.5} label="Security score" decimals={1} suffix="" />);
    await waitFor(() => expect(visibleText(container)).toBe("62.5"), { timeout: 1600 });
    const active = container.querySelectorAll("circle")[1]!;
    const expected = 2 * Math.PI * 42 * (1 - 0.625);
    await waitFor(() => expect(Number(getComputedStyle(active).strokeDashoffset)).toBeCloseTo(expected, 1), { timeout: 1800 });
  });

  it("reduced motion is immediate and every timed preset stays within 200–700ms", async () => {
    setSession((s) => ({ ...s, settings: { ...s.settings, reduceMotion: true } }));
    const format = (n: number) => `${n.toFixed(1)}%`;
    const { container, rerender } = render(<AnimatedNumber value={10} format={format} />);
    rerender(<AnimatedNumber value={80.5} format={format} />);
    await waitFor(() => expect(visibleText(container)).toBe("80.5%"));
    for (const duration of Object.values(MOTION.duration)) {
      expect(duration).toBeGreaterThanOrEqual(0.2);
      expect(duration).toBeLessThanOrEqual(0.7);
    }
    expect(pageExit.transition.duration).toBeGreaterThanOrEqual(0.2);
  });
});
