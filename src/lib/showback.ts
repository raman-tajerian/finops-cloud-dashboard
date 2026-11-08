import type { ShowbackTeamDto } from "@/types/finops";
import { fmtMoney } from "@/lib/money";
export function showbackCsv(teams: ShowbackTeamDto[]): string {
  const rows: (string | number)[][] = [["Team", "Spend (USD)", "Previous spend (USD)", "Change (%)", "Monthly budget (USD)", "Forecast (USD)", "Forecast budget usage (%)", "Display spend"]];
  for (const t of teams) rows.push([t.team, t.spend, t.previousSpend, t.changePct, t.budgetAmount, t.forecast, t.budgetUsagePct, fmtMoney(t.spend)]);
  return rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n");
}
export function downloadShowback(teams: ShowbackTeamDto[]) {
  const url = URL.createObjectURL(new Blob([showbackCsv(teams)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "fern-team-showback.csv"; a.click(); URL.revokeObjectURL(url);
}