// Report templates built only from the shared aggregates so totals match Overview, Cost Explorer, Recommendations and Security.
import type { Filters } from "@/lib/filters";
import type { MasterResource, ReportDto, ReportTemplateId, ReportTemplateMeta } from "@/types/finops";
import { buildDashboard, buildExplore } from "./aggregate";
import { buildSavings } from "./budgets";
import { buildSecurity, isOpenFinding } from "./security";
import { DEMO_TODAY } from "./resources";
import { fmtMoney, getActiveCurrency, type Currency } from "./currency";

export const REPORT_TEMPLATES: ReportTemplateMeta[] = [
  { id: "executive", name: "Executive summary", description: "Headline spend, forecast and savings for leadership.", sections: ["Headline KPIs (Overview)", "Spend by provider (Cost Explorer)", "Top savings categories (Recommendations)"] },
  { id: "team", name: "Team cost allocation", description: "Spend per team with change versus the previous period.", sections: ["Spend by team (Cost Explorer)", "Team totals"] },
  { id: "savings", name: "Savings report", description: "Open savings opportunities grouped by category.", sections: ["Savings by category (Recommendations)", "All open items"] },
  { id: "security", name: "Security summary", description: "Security score and open findings by severity.", sections: ["Score and counts (Security)", "Open findings"] },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildReport(all: MasterResource[], f: Filters, template: ReportTemplateId): ReportDto {
  const meta = REPORT_TEMPLATES.find((t) => t.id === template)!;
  const base = { template, title: meta.name, range: f.range, filters: f, generatedAt: DEMO_TODAY.toISOString().slice(0, 10) };
  if (template === "executive") {
    const d = buildDashboard(all, f), p = buildExplore(all, f, "provider"), s = buildSavings(all, f);
    const cats = new Map<string, number>();
    for (const i of s.items) cats.set(i.category, (cats.get(i.category) ?? 0) + i.savings);
    return { ...base, totals: { totalSpend: r2(d.overview.totalSpend.value), forecastEom: r2(d.overview.forecastEom.value), savingsOpportunity: r2(d.overview.savings.value), activeAnomalies: d.overview.anomalies.value },
      sections: [
        { title: "Spend by provider", columns: ["Provider", "Spend", "Previous", "Change %"], rows: p.rows.map((x) => [x.name, r2(x.current), r2(x.previous), r2(x.changePct)]) },
        { title: "Savings by category", columns: ["Category", "Monthly saving"], rows: [...cats].map(([k, v]) => [k, r2(v)]) },
      ] };
  }
  if (template === "team") {
    const t = buildExplore(all, f, "team");
    return { ...base, totals: { totalSpend: r2(t.total), previousSpend: r2(t.previousTotal) },
      sections: [{ title: "Spend by team", columns: ["Team", "Spend", "Previous", "Change %", "Share %"], rows: t.rows.map((x) => [x.name, r2(x.current), r2(x.previous), r2(x.changePct), r2(x.share)]) }] };
  }
  if (template === "savings") {
    const s = buildSavings(all, f);
    return { ...base, totals: { totalSavings: r2(s.total), target: r2(s.target), items: s.items.length },
      sections: [{ title: "Open savings items", columns: ["Title", "Category", "Resources", "Monthly saving", "Effort", "Risk"], rows: s.items.map((i) => [i.title, i.category, i.resourceIds.length, r2(i.savings), i.effort, i.risk]) }] };
  }
  const sec = buildSecurity(all, f);
  const open = sec.findings.filter((x) => isOpenFinding(x.status));
  return { ...base, totals: { score: sec.score, openFindings: open.length, critical: open.filter((x) => x.severity === "Critical").length, high: open.filter((x) => x.severity === "High").length },
    sections: [{ title: "Open findings", columns: ["ID", "Severity", "Title", "Provider", "First detected"], rows: open.map((x) => [x.id, x.severity, x.title, x.provider, x.detected]) }] };
}

// Money is stored in USD in the DTO and converted once, at export time, through the shared formatter.
const NON_MONEY_TOTALS = new Set(["activeAnomalies", "items", "score", "openFindings", "critical", "high"]);
const MONEY_COL = /spend|saving|cost|forecast|previous|target/i;
const fmtCell = (v: string | number, money: boolean, cur: Currency) => (money && typeof v === "number" ? fmtMoney(v, cur) : v);

const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function reportToCsv(r: ReportDto, cur: Currency = getActiveCurrency()): string {
  const out: string[] = [`# ${r.title}`, `# Range: ${r.range}; generated ${r.generatedAt} (demo); currency ${cur} (demo rates)`, "Metric,Value", ...Object.entries(r.totals).map(([k, v]) => `${k},${fmtCell(v, !NON_MONEY_TOTALS.has(k), cur)}`)];
  for (const s of r.sections) out.push("", `# ${s.title}`, s.columns.map(cell).join(","), ...s.rows.map((row) => row.map((v, i) => cell(fmtCell(v, MONEY_COL.test(s.columns[i] ?? ""), cur))).join(",")));
  return out.join("\n");
}
export const reportToJson = (r: ReportDto, cur: Currency = getActiveCurrency()) =>
  JSON.stringify({ ...r, currency: cur, note: "Money values are stored in USD and converted at display time with fixed demo rates." }, null, 2);
