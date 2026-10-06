import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Leaf, TrendingDown } from "lucide-react";
import { useSustainability } from "@/lib/queries";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CardSkeleton, DataTableView, EmptyState, ErrorState, StatusBadge, TableToggle } from "./States";
import type { CarbonBreakdown, SustainabilityRegionDto } from "@/types/finops";

const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const axis = { tick: { fontSize: 10, fill: "var(--muted-foreground)" }, tickLine: false, axisLine: false } as const;
const tons = (v: number) => `${v.toFixed(2)} t`;

function Kpi({ label, value, note, good }: { label: string; value: string; note: string; good?: boolean }) {
  return <article className="organic-card min-w-0 p-5"><p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p><p className="metric-numbers mt-4 text-2xl sm:text-3xl">{value}</p><p className={`mt-2 text-xs ${good ? "text-success" : "text-muted-foreground"}`}>{note}</p></article>;
}

function TrendChart({ data }: { data: { day: string; tons: number }[] }) {
  const [table, setTable] = useState(false);
  return <article className="organic-card p-5 lg:col-span-2"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">CO₂e trend</h2><p className="text-xs text-muted-foreground">Estimated emissions across the selected period</p></div><TableToggle on={table} onChange={setTable} /></div><div className="mt-5 h-72">{table ? <DataTableView caption="Daily estimated carbon emissions" columns={["Day", "CO₂e"]} rows={data.map((x) => [x.day, tons(x.tons)])} /> : <ResponsiveContainer><AreaChart data={data} margin={{ left: 4, right: 8 }}><defs><linearGradient id="carbon-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-2)" stopOpacity={0.28}/><stop offset="1" stopColor="var(--chart-2)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false}/><XAxis dataKey="day" {...axis} minTickGap={26}/><YAxis {...axis} width={44} tickFormatter={(v) => Number(v).toFixed(2)}/><Tooltip contentStyle={tip} formatter={(v) => [tons(Number(v)), "CO₂e"]}/><Area dataKey="tons" stroke="var(--chart-2)" fill="url(#carbon-fill)" strokeWidth={2}/></AreaChart></ResponsiveContainer>}</div></article>;
}

function BreakdownChart({ title, data }: { title: string; data: CarbonBreakdown[] }) {
  const [table, setTable] = useState(false);
  return <article className="organic-card p-5"><div className="flex items-start justify-between gap-2"><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground">Share of estimated CO₂e</p></div><TableToggle on={table} onChange={setTable} /></div><div className="mt-5 h-72">{table ? <DataTableView caption={title} columns={["Name", "CO₂e", "Share"]} rows={data.map((x) => [x.name, tons(x.tons), `${x.share.toFixed(1)}%`])} /> : <ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 8, right: 14 }}><CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false}/><XAxis type="number" {...axis} tickFormatter={(v) => Number(v).toFixed(1)}/><YAxis dataKey="name" type="category" width={84} {...axis}/><Tooltip contentStyle={tip} formatter={(v) => [tons(Number(v)), "CO₂e"]}/><Bar dataKey="tons" fill="var(--chart-1)" radius={[0, 4, 4, 0]}/></BarChart></ResponsiveContainer>}</div></article>;
}

type RegionSort = "region" | "provider" | "intensity" | "rating" | "tons" | "share";
function RegionTable({ data }: { data: SustainabilityRegionDto[] }) {
  const [sort, setSort] = useState<{ key: RegionSort; dir: 1 | -1 }>({ key: "tons", dir: -1 });
  const rows = useMemo(() => [...data].sort((a, b) => (typeof a[sort.key] === "number" ? Number(a[sort.key]) - Number(b[sort.key]) : String(a[sort.key]).localeCompare(String(b[sort.key]))) * sort.dir), [data, sort]);
  const head = (key: RegionSort, label: string) => <th className="px-4 py-3 font-medium"><button className="inline-flex min-h-10 items-center gap-1" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}>{label}{sort.key === key && (sort.dir === 1 ? <ArrowUp className="size-3"/> : <ArrowDown className="size-3"/>)}</button></th>;
  return <article className="organic-card overflow-hidden"><div className="border-b border-border p-5"><h2 className="font-semibold">Region ranking</h2><p className="text-xs text-muted-foreground">Highest estimated emissions first</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="font-mono text-[10px] uppercase text-muted-foreground"><tr>{head("region", "Region")}{head("provider", "Provider")}{head("intensity", "gCO₂/kWh")}{head("rating", "Rating")}{head("tons", "t CO₂e")}{head("share", "Share")}</tr></thead><tbody>{rows.map((r) => <tr key={r.region} className="border-t border-border hover:bg-secondary"><td className="px-4 py-3 font-medium">{r.region}</td><td className="px-4 py-3">{r.provider}</td><td className="metric-numbers px-4 py-3">{r.intensity}</td><td className="px-4 py-3"><StatusBadge tone={r.rating === "A" || r.rating === "B" ? "success" : r.rating === "C" ? "warning" : "critical"}>{r.rating}</StatusBadge></td><td className="metric-numbers px-4 py-3">{r.tons.toFixed(2)}</td><td className="metric-numbers px-4 py-3">{r.share.toFixed(1)}%</td></tr>)}</tbody></table></div></article>;
}

export function SustainabilityDashboard() {
  const q = useSustainability();
  if (q.isPending) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><CardSkeleton/><CardSkeleton/><CardSkeleton/></div>;
  if (q.isError) return <ErrorState message="We couldn't load sustainability estimates." onRetry={() => q.refetch()} />;
  const d = q.data;
  if (!d.regions.length) return <EmptyState icon={Leaf} title="No sustainability data matches these filters." action="Retry" onAction={() => q.refetch()} />;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Estimated CO₂e" value={tons(d.totalTons)} note={`${d.changePct >= 0 ? "+" : ""}${d.changePct.toFixed(1)}% vs previous period`} good={d.changePct < 0}/><Kpi label="Carbon intensity" value={`${d.kgPerThousandUsd.toFixed(1)} kg`} note="CO₂e per $1,000 spend"/><Kpi label="A/B-rated spend" value={`${d.abSpendShare.toFixed(1)}%`} note="Share of selected spend" good={d.abSpendShare >= 50}/><Kpi label="Greener moves" value={String(d.suggestions.length)} note="Prioritized workloads" good={d.suggestions.length > 0}/></div>
    <div className="grid gap-6 lg:grid-cols-2"><TrendChart data={d.trend}/><BreakdownChart title="CO₂e by provider" data={d.providers}/><BreakdownChart title="CO₂e by service" data={d.services}/></div>
    <RegionTable data={d.regions}/>
    <section><div className="mb-3 flex items-center gap-2"><TrendingDown className="size-4 text-success"/><h2 className="font-semibold">Greener region suggestions</h2></div><div className="grid gap-4 lg:grid-cols-3">{d.suggestions.map((s) => <article key={s.resourceId} className="organic-card p-5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{s.workload}</p><p className="text-xs text-muted-foreground">{s.provider} · {s.currentRegion} → {s.suggestedRegion}</p></div><StatusBadge tone="success">-{s.reductionPct.toFixed(0)}%</StatusBadge></div><p className="metric-numbers mt-5 text-2xl">-{tons(s.reductionTons)}</p><p className="mt-1 text-xs text-muted-foreground">Estimated CO₂e · cost {s.costChangePct >= 0 ? "+" : ""}{s.costChangePct.toFixed(1)}%</p></article>)}</div></section>
    <Accordion type="single" collapsible className="organic-card px-5"><AccordionItem value="formula" className="border-0"><AccordionTrigger>How this is calculated</AccordionTrigger><AccordionContent className="space-y-2 text-muted-foreground"><p>Estimated CO₂e = cloud cost × 2.2 kWh per USD × regional grid intensity (gCO₂/kWh), converted to tonnes.</p><p>Region suggestions stay within the same provider, choose a strictly lower-intensity region, and estimate cost change using deterministic regional cost indices.</p></AccordionContent></AccordionItem></Accordion>
    <p className="text-xs text-muted-foreground">All carbon, energy and regional cost figures are directional estimates, not audited emissions data.</p>
  </div>;
}