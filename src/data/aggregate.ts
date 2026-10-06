// Pure aggregation over the master dataset. Every number on screen comes from here.
import type { Filters } from "@/lib/filters";
import type {
  Anomaly, CarbonRegionDto, CostByDimension, DashboardDto, ExploreDto, GroupBy, KpiValue, MasterResource, Mover,
  ProviderDaily, RecommendationDto, RegionCost, ResourceDto, TopoNodeDto,
} from "@/types/finops";
import { businessVolume, DATA_END_DATE, dayAt, dayLabel, HISTORY_DAYS } from "./resources";
import { cluster, tickerSeed } from "./operations";
import { topoEdges, topoLayout } from "./topology";

export interface Window { start: number; end: number; days: number }
const H = HISTORY_DAYS;
const indexOf = (d: Date) => H - 1 - Math.round((DATA_END_DATE.getTime() - d.getTime()) / 86_400_000);

/** Current window (end exclusive) for a range. */
export function windowOf(range: Filters["range"]): Window {
  const dom = DATA_END_DATE.getUTCDate();
  if (range === "7d") return { start: H - 7, end: H, days: 7 };
  if (range === "mtd") return { start: H - dom, end: H, days: dom };
  if (range === "q3") { const s = indexOf(new Date(Date.UTC(2026, 6, 1))), e = indexOf(new Date(Date.UTC(2026, 8, 30))) + 1; return { start: s, end: e, days: e - s }; }
  return { start: H - 30, end: H, days: 30 };
}
export const previousOf = (w: Window): Window => ({ start: Math.max(0, w.start - w.days), end: w.start, days: w.days });

export const filterResources = (rs: MasterResource[], f: Filters) =>
  rs.filter((r) => f.providers.includes(r.provider) && (f.env === "All" || r.environment === f.env) && (f.team === "All" || r.team === f.team));

const sumWin = (r: MasterResource, w: Window) => { let s = 0; for (let i = w.start; i < w.end; i++) s += r.daily[i] ?? 0; return s; };
export const totalOf = (rs: MasterResource[], w: Window) => rs.reduce((a, r) => a + sumWin(r, w), 0);
const dailyOf = (rs: MasterResource[], w: Window) => Array.from({ length: w.end - w.start }, (_, k) => rs.reduce((a, r) => a + (r.daily[w.start + k] ?? 0), 0));
const sample = (xs: number[], n = 30) => xs.length <= n ? xs : Array.from({ length: n }, (_, i) => xs[Math.floor((i * xs.length) / n)]!);

export const keyOf: Record<GroupBy, (r: MasterResource) => string> = {
  service: (r) => r.category, provider: (r) => r.provider, region: (r) => r.region, team: (r) => r.team, environment: (r) => r.environment, tag: (r) => `app:${r.tags.app}`,
};
export function groupTotals(rs: MasterResource[], w: Window, g: GroupBy): CostByDimension[] {
  const m = new Map<string, number>();
  for (const r of rs) m.set(keyOf[g](r), (m.get(keyOf[g](r)) ?? 0) + sumWin(r, w));
  return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/* ---------- Anomaly detection: last 3 days vs. the prior 14-day baseline ---------- */
export function detectAnomalies(rs: MasterResource[], offset = 0): (Anomaly & { resourceId: string; index: number; region: string })[] {
  const end = H - offset;
  return rs.flatMap((r) => {
    const base = r.daily.slice(end - 17, end - 3).reduce((a, b) => a + b, 0) / 14;
    const recent = r.daily.slice(end - 3, end).reduce((a, b) => a + b, 0) / 3;
    const change = base > 0 ? (recent / base - 1) * 100 : 0;
    if (change < 50) return [];
    let first = end - 7; while (first < end - 1 && (r.daily[first] ?? 0) < base * 1.4) first++;
    return [{ id: `an-${r.id}`, resourceId: r.id, index: first, region: r.region, provider: r.provider, title: `${r.provider} ${r.service} · ${r.name}`, change: Math.round(change), impact: Math.round((recent - base) * 30), since: `${dayLabel(first)}, 2026` }];
  }).sort((a, b) => b.impact - a.impact);
}

/* ---------- Waste & recommendations ---------- */
const isOversized = (r: MasterResource) => r.status === "Running" && r.cpuAvg < 25 && ["Compute", "Database", "Kubernetes"].includes(r.category);
export const RIGHTSIZE_SAVING = 0.4;
const last30 = (r: MasterResource, offset = 0) => r.daily.slice(H - 30 - offset, H - offset).reduce((a, b) => a + b, 0);

export function buildRecommendations(rs: MasterResource[]): RecommendationDto[] {
  const groups = new Map<string, MasterResource[]>();
  for (const r of rs) {
    const k = r.status === "Idle" ? `idle|${r.service}|${r.team}` : isOversized(r) ? `size|${r.service}|${r.team}` : null;
    if (k) groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups].map(([k, items]) => {
    const [kind, service, team] = k.split("|") as [string, string, string];
    const idle = kind === "idle";
    const savings = Math.round(items.reduce((a, r) => a + r.monthlyCost * (idle ? 1 : RIGHTSIZE_SAVING), 0));
    const n = items.length;
    return {
      id: `rec-${kind}-${service}-${team}`.toLowerCase().replace(/\s+/g, "-"),
      title: idle ? `Remove ${n} idle ${service} resource${n > 1 ? "s" : ""}` : `Rightsize ${n} oversized ${service} resource${n > 1 ? "s" : ""}`,
      detail: idle ? `Avg CPU ${Math.round(items.reduce((a, r) => a + r.cpuAvg, 0) / n)}% · ${items.map((r) => r.region).filter((x, i, a) => a.indexOf(x) === i).join(", ")}` : `Avg CPU ${Math.round(items.reduce((a, r) => a + r.cpuAvg, 0) / n)}% · drop one size (≈${RIGHTSIZE_SAVING * 100}% saving)`,
      savings, impact: idle || savings < 2_000 ? "Quick Win" : "High Impact", team,
    } satisfies RecommendationDto;
  }).sort((a, b) => b.savings - a.savings);
}

/* ---------- Carbon ---------- */
const intensity: Record<string, number> = { "us-east-1": 379, "us-west-2": 240, "eu-west-1": 290, "eu-north-1": 28, westeurope: 268, northeurope: 210, "europe-west1": 112, "us-central1": 410 };
export const KWH_PER_USD = 2.2;
const rating = (g: number): CarbonRegionDto["rating"] => (g < 100 ? "A" : g < 200 ? "B" : g < 300 ? "C" : "D");

/* ---------- Dashboard ---------- */
const kv = (value: number, previous: number, spark: number[]): KpiValue => ({ value, previous, spark: sample(spark) });

export function buildDashboard(all: MasterResource[], f: Filters): DashboardDto {
  const rs = filterResources(all, f);
  const w = windowOf(f.range), pw = previousOf(w);
  const total = totalOf(rs, w), prevTotal = totalOf(rs, pw);
  const daily = dailyOf(rs, w);

  // Forecast end of month from the month-to-date window + 7-day run rate.
  const mw = windowOf("mtd"), dom = DATA_END_DATE.getUTCDate();
  const monthDays = new Date(Date.UTC(DATA_END_DATE.getUTCFullYear(), DATA_END_DATE.getUTCMonth() + 1, 0)).getUTCDate();
  const remaining = monthDays - dom;
  const last7 = dailyOf(rs, { start: H - 7, end: H, days: 7 });
  const rate = last7.reduce((a, b) => a + b, 0) / 7;
  const sd = Math.sqrt(last7.reduce((a, b) => a + (b - rate) ** 2, 0) / 7);
  const mtd = totalOf(rs, mw);
  const forecastEom = mtd + rate * remaining;
  const prevMonth = totalOf(rs, { start: H - dom - (monthDays - 1), end: H - dom, days: monthDays - 1 }); // previous month (30 days)

  const anomalies = detectAnomalies(rs), prevAnomalies = detectAnomalies(rs, 7);
  const idle = rs.filter((r) => r.status === "Idle");
  const oversized = rs.filter(isOversized);
  const recommendations = buildRecommendations(rs);
  const savings = recommendations.reduce((a, b) => a + b.savings, 0);
  const prevSavings = idle.reduce((a, r) => a + last30(r, 30), 0) + oversized.reduce((a, r) => a + last30(r, 30) * RIGHTSIZE_SAVING, 0);
  const idleWaste = idle.reduce((a, r) => a + r.monthlyCost, 0);
  const monthly = (t: number) => (t / w.days) * 30;
  const v = businessVolume;

  // Trend + forecast extension
  const ext = f.range === "mtd" ? remaining : 7;
  const trend: ProviderDaily[] = Array.from({ length: w.days }, (_, k) => {
    const i = w.start + k;
    const p = { AWS: 0, Azure: 0, GCP: 0 };
    for (const r of rs) p[r.provider] += r.daily[i] ?? 0;
    const tot = p.AWS + p.Azure + p.GCP;
    const an = anomalies.find((a) => a.index === i);
    return { day: dayLabel(i), ...p, total: tot, forecast: k === w.days - 1 ? tot : null, band: k === w.days - 1 ? [tot, tot] : null, ...(an ? { anomaly: an.title } : {}) };
  });
  for (let k = 1; k <= ext; k++) {
    const d = new Date(DATA_END_DATE.getTime() + k * 86_400_000);
    const spread = 1.96 * sd * Math.sqrt(k);
    trend.push({ day: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), AWS: 0, Azure: 0, GCP: 0, total: 0, forecast: rate, band: [Math.max(0, rate - spread), rate + spread] });
  }

  // Movers
  const movers: Mover[] = rs.map((r) => { const c = sumWin(r, w), p = sumWin(r, pw); return { id: r.id, name: r.name, provider: r.provider, service: r.service, current: c, previous: p, delta: c - p }; });
  const up = movers.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
  const down = movers.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);

  // Regions
  const regionMap = new Map<string, RegionCost>();
  for (const r of rs) { const row = regionMap.get(r.region) ?? { region: r.region, AWS: 0, Azure: 0, GCP: 0 }; row[r.provider] += sumWin(r, w); regionMap.set(r.region, row); }
  const regions = [...regionMap.values()].sort((a, b) => b.AWS + b.Azure + b.GCP - (a.AWS + a.Azure + a.GCP));

  // Carbon per region
  const carbon: CarbonRegionDto[] = regions.map((r) => {
    const cost = r.AWS + r.Azure + r.GCP, g = intensity[r.region] ?? 300;
    const provider = (["AWS", "Azure", "GCP"] as const).reduce((a, b) => (r[b] > r[a] ? b : a));
    return { region: r.region, provider, intensity: g, rating: rating(g), tons: (cost * KWH_PER_USD * g) / 1e6 };
  }).sort((a, b) => a.intensity - b.intensity);

  // Topology costs/health derived from resources
  const topology: { nodes: TopoNodeDto[]; edges: typeof topoEdges } = {
    nodes: topoLayout.map((n) => {
      const members = rs.filter(n.match);
      const health = members.some((m) => anomalies.some((a) => a.resourceId === m.id)) ? "anomaly" : members.some(isOversized) ? "oversized" : "ok";
      return { id: n.id, label: n.label, kind: n.kind, x: n.x, y: n.y, z: n.z, cost: Math.round(totalOf(members, w)), health };
    }),
    edges: topoEdges,
  };

  const resources: ResourceDto[] = rs.map((r) => ({ id: r.id, name: r.name, provider: r.provider, type: `${r.service} · ${r.sku}`, region: r.region, monthlyCost: r.monthlyCost, status: r.status }));
  const sumBy = (xs: MasterResource[]) => dailyOf(xs, w);

  return {
    providers: f.providers,
    totals: { total, byProvider: groupTotals(rs, w, "provider") },
    kpis: {
      spend: { total: Math.round(total), mom: prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : 0, burn: Math.round(total / w.days), projected: Math.round(forecastEom) },
      waste: { total: Math.round(idleWaste), ebs: idle.filter((r) => r.category === "Storage").length, rds: idle.filter((r) => r.category === "Database").length, ec2: oversized.length },
      anomalies: anomalies.map(({ resourceId: _r, index: _i, region: _g, ...a }) => a),
      unit: { perUser: monthly(total) / v.activeUsers, perRequest: monthly(total) / v.apiRequests, activeUsers: v.activeUsers, requests: v.apiRequests, perDeployment: monthly(total) / v.deployments, perSession: monthly(total) / v.sessions },
    },
    overview: {
      totalSpend: kv(total, prevTotal, daily),
      forecastEom: kv(forecastEom, prevMonth, daily.map((_, i, a) => a.slice(0, i + 1).reduce((x, y) => x + y, 0))),
      dailyBurn: kv(total / w.days, prevTotal / w.days, daily),
      savings: kv(savings, prevSavings, sumBy([...idle, ...oversized])),
      idleWaste: kv(idleWaste, idle.reduce((a, r) => a + last30(r, 30), 0), sumBy(idle)),
      anomalies: kv(anomalies.length, prevAnomalies.length, sumBy(rs.filter((r) => anomalies.some((a) => a.resourceId === r.id)))),
      costPerUser: kv(monthly(total) / v.activeUsers, monthly(prevTotal) / v.activeUsers, daily),
      costPerRequest: kv(monthly(total) / v.apiRequests, monthly(prevTotal) / v.apiRequests, daily),
      idleCount: idle.length,
    },
    services: groupTotals(rs, w, "service"),
    teams: groupTotals(rs, w, "team"),
    regions,
    daily: daily.map((spend, k) => ({ day: dayLabel(w.start + k), spend: Math.round(spend) })),
    trend,
    movers: { up, down },
    recommendations,
    cluster, ticker: tickerSeed,
    forecast: trend.map((t) => ({ day: t.day, forecast: t.forecast ?? t.total, band: t.band ?? [t.total, t.total], actual: t.forecast !== null && t.total === 0 ? null : t.total })),
    carbon, topology, resources,
  };
}

/* ---------- Cost explorer ---------- */
export function buildExplore(all: MasterResource[], f: Filters, g: GroupBy): ExploreDto {
  const rs = filterResources(all, f), w = windowOf(f.range), pw = previousOf(w);
  const cur = groupTotals(rs, w, g), prev = new Map(groupTotals(rs, pw, g).map((x) => [x.name, x.value]));
  const total = cur.reduce((a, b) => a + b.value, 0), previousTotal = [...prev.values()].reduce((a, b) => a + b, 0);
  const keys = cur.map((c) => c.name);
  const series = Array.from({ length: w.days }, (_, k) => {
    const i = w.start + k, row: Record<string, number | string> = { day: dayLabel(i), date: dayAt(i).toISOString().slice(0, 10) };
    for (const key of keys) row[key] = 0;
    let t = 0, p = 0;
    for (const r of rs) { const val = r.daily[i] ?? 0; row[keyOf[g](r)] = (row[keyOf[g](r)] as number) + val; t += val; p += r.daily[pw.start + k] ?? 0; }
    row["total"] = t; row["previous"] = p;
    return row;
  });
  const rows = cur.map((c) => {
    const p = prev.get(c.name) ?? 0;
    return { name: c.name, current: c.value, previous: p, changePct: p ? ((c.value - p) / p) * 100 : 0, share: total ? (c.value / total) * 100 : 0, spark: sample(series.map((s) => s[c.name] as number), 20) };
  });
  return { groupBy: g, keys, series, rows, total, previousTotal };
}
