// Session-only demo state (recommendation statuses, budgets, alert rules). Nothing is persisted or sent anywhere.
import { useSyncExternalStore } from "react";

export type RecStatus = "Open" | "In progress" | "Done" | "Ignored" | "Snoozed";
export interface RecState { status: RecStatus; team?: string; reason?: string }
export interface SessionBudget { id: string; name: string; scope: string; amount: number; period: "monthly" | "quarterly"; thresholds: number[]; channels: string[]; demo: boolean }
export interface AlertRule { id: string; name: string; condition: string; channel: string; enabled: boolean }
export type AnomalyStatus = "New" | "Investigating" | "Resolved";

interface State { recs: Record<string, RecState>; budgets: SessionBudget[]; rules: AlertRule[]; anomalies: Record<string, AnomalyStatus> }
let state: State = {
  recs: {},
  budgets: [],
  rules: [
    { id: "rule-1", name: "Budget 80% reached", condition: "Forecast ≥ 80% of any budget", channel: "Slack", enabled: true },
    { id: "rule-2", name: "Budget exceeded", condition: "Forecast ≥ 100% of any budget", channel: "Email", enabled: true },
    { id: "rule-3", name: "Cost anomaly", condition: "3-day spend ≥ 50% above 14-day baseline", channel: "Teams", enabled: true },
    { id: "rule-4", name: "Idle resource found", condition: "Resource idle for 7 days", channel: "Email", enabled: false },
  ],
  anomalies: {},
};
const subs = new Set<() => void>();
export function setSession(fn: (s: State) => State) { state = fn(state); subs.forEach((f) => f()); }
export function useSession<T>(sel: (s: State) => T): T {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => sel(state), () => sel(state));
}
export const recStatus = (recs: Record<string, RecState>, id: string): RecStatus => recs[id]?.status ?? "Open";
