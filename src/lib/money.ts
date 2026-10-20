// React bindings for the currency layer in src/data/currency.ts.
import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  CURRENCIES,
  convert,
  fmtMoney,
  fmtMoneyCompact,
  getActiveCurrency,
  normalizeCurrency,
  setActiveCurrency,
  subscribeCurrency,
  type Currency,
} from "@/data/currency";
import { useSyncExternalStore } from "react";

export { CURRENCIES, convert, fmtMoney, fmtMoneyCompact, normalizeCurrency };
export type { Currency };

/** Subscribes to the active currency. Use when a component must re-render on currency change. */
export function useCurrency(): Currency {
  return useSyncExternalStore(subscribeCurrency, getActiveCurrency, getActiveCurrency);
}

export function useMoney() {
  const currency = useCurrency();
  return {
    currency,
    fmt: (usd: number, opts?: Parameters<typeof fmtMoney>[2]) => fmtMoney(usd, currency, opts),
    fmtCompact: (usd: number) => fmtMoneyCompact(usd, currency),
  };
}

/** Writes the currency to the ?cur= URL search param (survives reload and sharing). */
export function useSetCurrency() {
  const navigate = useNavigate();
  return (cur: Currency) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, cur }),
      replace: true,
      resetScroll: false,
    } as never);
}

/** Keeps the module-level active currency in sync with the ?cur= URL param. Mount once in the Shell. */
export function CurrencySync() {
  const search = useSearch({ strict: false }) as { cur?: string };
  const cur = normalizeCurrency(search.cur);
  useEffect(() => setActiveCurrency(cur), [cur]);
  return null;
}
