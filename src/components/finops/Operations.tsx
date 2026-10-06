import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Boxes, Calculator, ChevronDown } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { fmtUSD } from "@/lib/finops-data";
import { useBudget, useKubernetes, useScenario } from "@/lib/queries";
import { budgetTone, simulate } from "@/lib/scenario";
import type { K8sClusterDto, K8sPodDto } from "@/types/finops";
import { CardBoundary, CardSkeleton, DataTableView, EmptyState, ErrorState, StatusBadge, TableToggle } from "./States";
import { CountUp } from "./Insights";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const Title = ({ children, sub }: { children: ReactNode; sub?: ReactNode }) => <div className="min-w-0"><p className="text-[15px] font-medium leading-snug">{children}</p>{sub && <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>}</div>;

function Gate<T>({ q, h, children }: { q: UseQueryResult<T>; h?: string; children: (d: T) => ReactNode }) {
  if (q.isPending) return <CardSkeleton h={h ?? "h-40"} />;
  if (q.isError || !q.data) return <ErrorState message="We couldn't load this data. Check your connection and try again." onRetry={() => q.refetch()} />;
  return <CardBoundary onReset={() => q.refetch()}>{children(q.data)}</CardBoundary>;
}

/* ================= Kubernetes ================= */
const podColor: Record<K8sPodDto["status"], string> = { Running: "var(--success)", Pending: "var(--warning)", Failed: "var(--destructive)" };

export function KubernetesWorkspace() {
  const q = useKubernetes();
  return <Gate q={q} h="h-72">{(d) => d.clusters.length ? <Clusters clusters={d.clusters} /> : <EmptyState icon={Boxes} title="No Kubernetes clusters match the current filters." action="Reload" onAction={() => q.refetch()} />}</Gate>;
}

type SortKey = "name" | "cost" | "efficiency";
function Clusters({ clusters }: { clusters: K8sClusterDto[] }) {
  const [id, setId] = useState(clusters[0]!.id);
  const c = clusters.find((x) => x.id === id) ?? clusters[0]!;
  const [asTable, setAsTable] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "cost", dir: -1 });
  const [pod, setPod] = useState<K8sPodDto | null>(null);
  const [podTable, setPodTable] = useState(false);
  const ns = useMemo(() => [...c.namespaces].sort((a, b) => sort.dir * (sort.k === "name" ? a.name.localeCompare(b.name) : sort.k === "cost" ? a.cost - b.cost : a.efficiency - b.efficiency)), [c, sort]);
  const th = (k: SortKey, label: string, right?: boolean) => (
    <th scope="col" className={`px-4 py-2 font-medium ${right ? "text-right" : ""}`} aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="inline-flex min-h-10 items-center gap-1 hover:text-foreground" onClick={() => setSort({ k, dir: sort.k === k && sort.dir === -1 ? 1 : -1 })}>{label}{sort.k === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</button>
    </th>
  );
  return (
    <div className="space-y-6">
      <section className="organic-card grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <Title sub={`${c.provider} ${c.service} · ${c.region} · ${c.environment}`}>Cluster</Title>
        <Select value={c.id} onValueChange={setId}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-72" aria-label="Cluster"><SelectValue /></SelectTrigger>
          <SelectContent>{clusters.map((x) => <SelectItem key={x.id} value={x.id}>{x.name} · {x.service}</SelectItem>)}</SelectContent>
        </Select>
      </section>
      <section aria-label="Cluster metrics" className="grid gap-4 sm:grid-cols-3">
        {[["Monthly cost", fmtUSD(c.monthlyCost), "Last 30 days"], ["Nodes", String(c.nodes), "max(3, cost / $350)"], ["Pod health", `${c.podsHealthy}/${c.podsTotal}`, `${c.podsFailed} failed or pending`]].map(([l, v, n]) => (
          <div key={l} className="organic-card p-5"><p className="text-[13px] text-muted-foreground">{l}</p><p className="mt-2 font-display text-[32px] leading-none tracking-tight tabular-nums">{v}</p><p className="mt-3 text-xs text-muted-foreground">{n}</p></div>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="organic-card min-w-0 p-6">
          <div className="flex items-start justify-between gap-3"><Title sub="Fixed namespace weights; sums to the cluster cost">Cost per namespace</Title><TableToggle on={asTable} onChange={setAsTable} /></div>
          <div className="mt-5 h-64">
            {asTable ? <DataTableView caption="Cost per namespace" columns={["Namespace", "Weight", "Cost"]} rows={c.namespaces.map((n) => [n.name, `${Math.round(n.weight * 100)}%`, fmtUSD(n.cost)])} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={c.namespaces} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} formatter={(v) => fmtUSD(Number(v))} />
                  <Bar dataKey="cost" radius={[6, 6, 0, 0]}>{c.namespaces.map((n) => <Cell key={n.name} fill={n.overProvisioned ? "var(--chart-3)" : "var(--chart-1)"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
        <article className="organic-card min-w-0 p-6">
          <Title sub={`Efficiency = avg(CPU ${c.cpuAvg}%, memory ${c.memAvg}%) × namespace factor; under 30% is over-provisioned`}>Namespaces</Title>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{th("name", "Namespace")}{th("cost", "Cost", true)}{th("efficiency", "Efficiency", true)}<th className="px-4 py-2 font-medium">Status</th></tr></thead>
              <tbody>{ns.map((n) => <tr key={n.name}><td className="px-4 py-2">{n.name}</td><td className="px-4 py-2 text-right tabular-nums">{fmtUSD(n.cost)}</td><td className="px-4 py-2 text-right tabular-nums">{n.efficiency}%</td><td className="px-4 py-2">{n.overProvisioned ? <StatusBadge tone="warning">Over-provisioned</StatusBadge> : <StatusBadge tone="success">Efficient</StatusBadge>}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </div>
      <article className="organic-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><Title sub="Each square is one pod. Hover for details, click to open.">Pod status</Title>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><TableToggle on={podTable} onChange={setPodTable} />{(["Running", "Pending", "Failed"] as const).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: podColor[s] }} />{s}</span>)}</div></div>
        {podTable ? <div className="mt-5 h-72"><DataTableView caption="Pods" columns={["Pod", "Namespace", "Status", "Restarts"]} rows={c.pods.map((p) => [p.name, p.namespace, p.status, p.restarts])} /></div> : <div className="mt-5 flex flex-wrap gap-1" role="list" aria-label="Pods">
          {c.pods.map((p) => <button key={p.name} role="listitem" title={`${p.name} · ${p.status} · ${p.restarts} restarts`} aria-label={`${p.name}, ${p.status}, ${p.restarts} restarts`} onClick={() => setPod(p)} className="size-3.5 rounded-[3px] transition-transform hover:scale-125 focus-visible:scale-125" style={{ background: podColor[p.status], opacity: p.status === "Running" ? 0.55 : 1 }} />)}
        </div>}
      </article>
      <Sheet open={!!pod} onOpenChange={(o) => !o && setPod(null)}>
        <SheetContent>
          {pod && <><SheetHeader><SheetTitle className="break-all">{pod.name}</SheetTitle><SheetDescription>{c.name} · namespace {pod.namespace}</SheetDescription></SheetHeader>
            <dl className="mt-6 divide-y divide-border text-sm">{[["Status", pod.status], ["Restarts", String(pod.restarts)], ["Namespace", pod.namespace], ["Cluster", c.name], ["Region", c.region]].map(([k, v]) => <div key={k} className="flex justify-between py-3"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>)}</dl></>}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ================= Budget ================= */
const toneColor = { success: "var(--success)", warning: "var(--warning)", critical: "var(--destructive)" } as const;
export function BudgetForecast() {
  const q = useBudget();
  return <Gate q={q} h="h-60">{(d) => <BudgetCard d={d} />}</Gate>;
}
function BudgetCard({ d }: { d: NonNullable<ReturnType<typeof useBudget>["data"]> }) {
  const [budget, setBudget] = useState(d.defaultBudget);
  useEffect(() => setBudget(d.defaultBudget), [d.defaultBudget]);
  const pct = budget > 0 ? (d.forecastEom / budget) * 100 : 0;
  const tone = budgetTone(pct);
  return (
    <article className="organic-card flex h-full flex-col p-6 md:p-8">
      <div className="flex items-start justify-between gap-3"><Title sub={`${d.period} · day ${d.dayOfMonth} of ${d.monthDays}`}>Budget & forecast</Title><StatusBadge tone={tone}>{pct.toFixed(1)}% of budget</StatusBadge></div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div><p className="text-[13px] text-muted-foreground">Spend to date</p><p className="mt-1 font-display text-[30px] leading-none tabular-nums"><CountUp value={d.spendToDate} format={(n) => fmtUSD(n)} /></p></div>
        <div><p className="text-[13px] text-muted-foreground">Projected end of month</p><p className="mt-1 font-display text-[30px] leading-none tabular-nums"><CountUp value={d.forecastEom} format={(n) => fmtUSD(n)} /></p></div>
      </div>
      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Projected % of budget</span><span className="tabular-nums">{pct.toFixed(1)}%</span></div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: toneColor[tone] }} />
          <span className="absolute inset-y-0 left-[80%] w-px bg-foreground/30" aria-hidden />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>0%</span><span className="ml-[70%]">80%</span><span>100%</span></div>
      </div>
      <div className="mt-auto space-y-3 pt-6">
        <label className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Monthly budget</span>
          <Input type="number" min={0} step={1000} value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))} className="h-10 w-40 rounded-xl text-right tabular-nums" aria-label="Monthly budget" /></label>
        <Slider value={[budget]} min={Math.round(d.defaultBudget * 0.6)} max={Math.round(d.defaultBudget * 1.4)} step={500} onValueChange={([v]) => setBudget(v ?? d.defaultBudget)} aria-label="Monthly budget slider" />
        <p className="text-xs text-muted-foreground">Default {fmtUSD(d.defaultBudget)} = 105% of last quarter's spend ({fmtUSD(d.previousQuarterSpend)}) ÷ 3. Forecast uses the same rule as Overview.</p>
      </div>
    </article>
  );
}

/* ================= What-if simulator ================= */
export function WhatIfSimulator() {
  const q = useScenario();
  return <Gate q={q} h="h-60">{(d) => <Simulator d={d} />}</Gate>;
}
function Simulator({ d }: { d: NonNullable<ReturnType<typeof useScenario>["data"]> }) {
  const [l, setL] = useState({ ri: 0, migrate: 0, rightsize: 0 });
  const [asTable, setAsTable] = useState(false);
  const r = simulate(d, l);
  const sign = (n: number) => (Math.abs(n) < 0.5 ? "$0" : n > 0 ? `−${fmtUSD(n)}` : `+${fmtUSD(-n)}`);
  const levers = [
    { k: "ri" as const, label: "Shift compute to Reserved Instances", save: r.ri },
    { k: "migrate" as const, label: `Migrate ${d.migrateFrom} → ${d.migrateTo}`, save: r.migrate },
    { k: "rightsize" as const, label: "Rightsize oversized and idle resources", save: r.rightsize },
  ];
  const chart = [{ name: "Baseline", v: d.baseline }, { name: "Projected", v: r.projected }];
  return (
    <article className="organic-card h-full min-w-0 p-6">
      <div className="flex items-start justify-between gap-3"><Title sub={`Baseline = Total spend for the selected ${d.days} days`}>What-if scenario simulator</Title><Calculator className="size-4 shrink-0 text-muted-foreground" /></div>
      <div className="mt-5 space-y-5">
        {levers.map((x) => (
          <div key={x.k}>
            <div className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0">{x.label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{l[x.k]}% · <span className={x.save >= 0 ? "text-success" : "text-warning"}>{sign(x.save)}</span></span></div>
            <Slider className="mt-3" value={[l[x.k]]} max={100} step={5} onValueChange={([n]) => setL((p) => ({ ...p, [x.k]: n ?? 0 }))} aria-label={x.label} />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5 text-sm">
        <div><p className="text-[13px] text-muted-foreground">Baseline</p><p className="mt-1 font-display text-2xl tabular-nums">{fmtUSD(d.baseline)}</p></div>
        <div><p className="text-[13px] text-muted-foreground">Projected</p><p className="mt-1 font-display text-2xl tabular-nums"><CountUp value={r.projected} format={(n) => fmtUSD(n)} /></p></div>
        <div><p className="text-[13px] text-muted-foreground">Savings</p><p className={`mt-1 font-display text-2xl tabular-nums ${r.savings >= 0 ? "text-success" : "text-warning"}`}>{fmtUSD(r.savings)}</p><p className="text-xs text-muted-foreground tabular-nums">{r.pct.toFixed(1)}%</p></div>
      </div>
      <div className="mt-4 flex justify-end"><TableToggle on={asTable} onChange={setAsTable} /></div>
      <div className="h-40">
        {asTable ? <DataTableView caption="Before and after" columns={["Scenario", "Cost"]} rows={chart.map((c) => [c.name, fmtUSD(c.v)])} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} formatter={(v) => fmtUSD(Number(v))} />
              <Bar dataKey="v" radius={[0, 6, 6, 0]} barSize={22}>{chart.map((c, i) => <Cell key={c.name} fill={i ? "var(--chart-1)" : "var(--chart-6)"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <Collapsible className="mt-4 rounded-xl border border-border">
        <CollapsibleTrigger asChild><Button variant="ghost" className="w-full justify-between rounded-xl">Assumptions<ChevronDown className="size-4" /></Button></CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 px-4 pb-4 text-xs text-muted-foreground">
          <p>Reserved Instances: compute + Kubernetes spend ({fmtUSD(d.computeSpend)}) × slider × {Math.round(d.riDiscount * 100)}% discount.</p>
          <p>Region migration: {d.migrateFrom} spend ({fmtUSD(d.migrateSpend)}) × slider × (1 − cost index ratio {d.costRatio.toFixed(2)}). Carbon uses {d.intensityFrom} → {d.intensityTo} gCO₂/kWh, same as Sustainability{r.co2Reduction > 0 ? ` (≈ ${r.co2Reduction.toFixed(1)} t CO₂e less)` : ""}.</p>
          <p>Rightsizing: sum of the Recommendations saving per resource ({fmtUSD(d.rightsizeEligible)} for this period) × slider.</p>
          <p>All results are estimates.</p>
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}
