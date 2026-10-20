// Currency display layer. All data-layer values are and stay in USD; conversion
// happens once at display/format time, never before aggregation.
// Rates below are fixed DEMO rates (labelled "Demo rates" in the UI) — not live FX.
export type Currency = "USD" | "EUR" | "SEK" | "GBP";

export const CURRENCIES: Currency[] = ["USD", "EUR", "SEK", "GBP"];

/** Demo rates: 1 USD = rate units of the target currency. Fixed, documented demo values. */
export const DEMO_RATES: Record<Currency, number> = { USD: 1, EUR: 0.92, SEK: 10.55, GBP: 0.79 };

export const normalizeCurrency = (raw: string | undefined): Currency =>
  (CURRENCIES as string[]).includes(raw ?? "") ? (raw as Currency) : "USD";

export const convert = (usd: number, cur: Currency): number => usd * DEMO_RATES[cur];

// --- Active currency store (synced from the ?cur= URL param by CurrencySync in the Shell) ---
let active: Currency = "USD";
const subs = new Set<() => void>();
export function setActiveCurrency(cur: Currency) {
  if (cur === active) return;
  active = cur;
  subs.forEach((f) => f());
}
export const getActiveCurrency = (): Currency => active;
export const subscribeCurrency = (cb: () => void): (() => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

export interface MoneyOpts { decimals?: number; sign?: boolean }

/** One shared formatter for every money value in the app. Input is always USD. */
export function fmtMoney(usd: number, cur: Currency = active, opts: MoneyOpts = {}): string {
  const decimals = opts.decimals ?? 0;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(convert(Math.abs(usd), cur));
  if (usd < 0) return `−${formatted}`;
  return opts.sign && usd > 0 ? `+${formatted}` : formatted;
}

/** Compact variant for chart axes and dense tooltips ($12k / 127 kSEK style via Intl notation). */
export function fmtMoneyCompact(usd: number, cur: Currency = active): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(convert(usd, cur));
}
