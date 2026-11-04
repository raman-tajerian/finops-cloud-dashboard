import { dayAt, HISTORY_DAYS, mulberry32 } from "./resources";

export interface UsageDay { date: string; activeUsers: number; apiRequests: number }
/** Independent seeds: weekday seasonality, 2% monthly growth, ±2% noise. */
export function buildUsageHistory(): UsageDay[] {
  const users = mulberry32(20261104), requests = mulberry32(20261105);
  return Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const date = dayAt(i), weekday = date.getUTCDay();
    const growth = 1.02 ** ((i - HISTORY_DAYS + 1) / 30);
    return {
      date: date.toISOString().slice(0, 10),
      activeUsers: Math.round(2_250_000 * growth * (weekday === 0 || weekday === 6 ? 0.86 : 1.04) * (0.98 + users() * 0.04)),
      apiRequests: Math.round(72_000_000 * growth * (weekday === 0 || weekday === 6 ? 0.78 : 1.08) * (0.98 + requests() * 0.04)),
    };
  });
}
export const usageHistory = buildUsageHistory();