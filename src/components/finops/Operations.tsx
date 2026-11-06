import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight, Container, Gauge, Pencil, Server, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney, fmtMoneyCompact } from "@/lib/finops-data";
import { useBudget, useDashboardData, useKubernetes } from "@/lib/queries";
import { useSession, setSession } from "@/lib/session-store";
import { CardSkeleton, EmptyState, ErrorState, DataTableView, TableToggle } from "./States";
import { AnimatedNumber } from "@/components/motion";
import type { K8sCluster, K8sPod } from "@/types/finops";

const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const Label = ({ children }: { children: React.ReactNode }) => <p className="text-[15px] font-medium leading-snug text-foreground">{children}</p>;

/* ---------- Kubernetes ---------- */
export function KubernetesWorkspace({ tab }: { tab: string }) {
  const q = useKubernetes();
  const [id, setId] = useState<string | null>(null);
  const [pod, setPod] = useState<K8sPod | null>(null);
  if (q.isPending) return <CardSkeleton h="h-96" />;
  if (q.isError || !q.data) return <ErrorState message="We couldn't load cluster data. Try again." onRetry={() => q.refetch()} />;
  if (q.data.clusters.length === 0) return <EmptyState title="No clusters match your filters" description="No EKS, AKS or GKE resources match the active filters." />;
  const c = q.data.clusters.find((x) => x.id === id) ?? q.data.clusters[0]!;
  const picker = (
    <Select value={c.id} onValueChange={setId}>
      <SelectTrigger aria-label="Select cluster" className="h-10 w-full sm:w-72"><SelectValue /></SelectTrigger>
      <SelectContent>{q.data.clusters.map((x) => <SelectItem key={x.id} value={x.id}>{x.name} ({x.provider})</SelectItem>)}</SelectContent>
    </Select>
  );
  return (
    <div className="space-y-6">
      {tab === "clusters" && <ClusterOverview c={c} picker={picker} />}
      {tab === "namespaces" && <Namespaces c={c} picker={picker} />}
      {tab === "pods" && <Pods c={c} picker={picker} onOpen={setPod} />}
      <PodDrawer pod={pod} onClose={() => setPod(null)} />
    </div>
  );
}

function ClusterOverview({ c, picker }: { c: K8sCluster; picker: React.ReactNode }) {
  const eff = Math.round((c.cpu + c.mem) / 2);
  return (
    <section className="organic-card space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Label>Cluster health</Label><p className="mt-1 text-[13px] text-muted-foreground">Derived from the resource dataset · utilization is simulated</p></div>
        {picker}
      </div>
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-5">
        {[
          { label: "Monthly cost", value: fmtMoney(c.cost) },
          { label: "Nodes", value: `${c.nodes}` },
          { label: "Pods", value: `${c.pods.healthy + c.pods.pending + c.pods.failed}` },
          { label: "Pod health", value: `${Math.round((c.pods.healthy / (c.pods.healthy + c.pods.pending + c.pods.failed)) * 100)}%` },
          { label: "Efficiency", value: `${eff}%`, warn: eff < 30 },
        ].map((m) => (
          <div key={m.label} className="border-l-2 pl-3" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className={`metric-numbers mt-1 text-2xl ${m.warn ? "text-warning" : ""}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Namespaces({ c, picker }: { c: K8sCluster; picker: React.ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  const [sort, setSort] = useState<{ k: "cost" | "efficiency"; dir: 1 | -1 }>({ k: "cost", dir: -1 });
  const ns = useMemo(() => [...c.namespaces].sort((a, b) => (a[sort.k] - b[sort.k]) * sort.dir), [c, sort]);
  const maxCost = Math.max(...c.namespaces.map((n) => n.cost), 1);
  const th = (k: "cost" | "efficiency", l: string) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="px-4 py-2 text-right font-medium">
      <button className="inline-flex h-8 items-center hover:text-foreground" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))}>{l}{sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</button>
    </th>
  );
  return (
    <div className="space-y-6">
      <div className="flex justify-end">{picker}</div>
      <section className="organic-card p-6">
        <div className="flex items-start justify-between gap-2"><div><Label>Cost per namespace</Label><p className="mt-1 text-[13px] text-muted-foreground">Fixed split weights sum exactly to the cluster cost</p></div><TableToggle on={asTable} onChange={setAsTable} /></div>
        {asTable ? <DataTableView caption="Namespace cost" columns={["Namespace", "Cost", "Share"]} rows={c.namespaces.map((n) => [n.name, fmtMoney(n.cost), `${((n.cost / c.cost) * 100).toFixed(0)}%`])} /> : (
          <div className="mt-6 space-y-3">
            {c.namespaces.map((n) => (
              <div key={n.name} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm">{n.name}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full" style={{ width: `${(n.cost / maxCost) * 100}%`, background: "var(--chart-1)" }} /></div>
                <span className="metric-numbers w-20 text-right text-sm">{fmtMoneyCompact(n.cost)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="organic-card relative inline-contain min-w-0 max-w-full overflow-hidden">
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Namespaces</caption>
            <thead className="font-mono text-[10px] text-muted-foreground"><tr><th scope="col" className="px-4 py-2 font-medium">Namespace</th>{th("cost", "Cost /mo")}{th("efficiency", "Efficiency")}<th scope="col" className="px-4 py-2 font-medium">Status</th></tr></thead>
            <tbody>
              {ns.map((n) => (
                <tr key={n.name} className="border-t border-border">
                  <td className="sticky left-0 bg-card px-4 py-2.5 font-medium">{n.name}</td>
                  <td className="metric-numbers px-4 py-2.5 text-right">{fmtMoney(n.cost)}</td>
                  <td className="metric-numbers px-4 py-2.5 text-right">{n.efficiency}%</td>
                  <td className="px-4 py-2.5">{n.efficiency < 30 ? <Badge className="border-transparent bg-warning-soft text-warning">Over-provisioned</Badge> : <Badge variant="secondary">Healthy</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Pods({ c, picker, onOpen }: { c: K8sCluster; picker: React.ReactNode; onOpen: (p: K8sPod) => void }) {
  const [asTable, setAsTable] = useState(false);
  const color = (s: K8sPod["status"]) => (s === "healthy" ? "var(--success)" : s === "pending" ? "var(--warning)" : "var(--destructive)");
  return (
    <section className="organic-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Label>Pod status</Label><p className="mt-1 text-[13px] text-muted-foreground">{c.pods.healthy} healthy · {c.pods.pending} pending · {c.pods.failed} failed — simulated</p></div>
        <div className="flex flex-wrap items-center gap-2">{picker}<TableToggle on={asTable} onChange={setAsTable} /></div>
      </div>
      {asTable ? <div className="mt-6"><DataTableView caption="Pods" columns={["Pod", "Namespace", "Status", "Restarts"]} rows={c.podGrid.map((p) => [p.name, p.namespace, p.status, String(p.restarts)])} /></div> : (
        <div className="mt-6 grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(18px, 1fr))" }} role="list" aria-label="Pods">
          {c.podGrid.map((p) => (
            <button key={p.name} role="listitem" aria-label={`${p.name}: ${p.status}, ${p.restarts} restarts`} onClick={() => onOpen(p)}
              className="aspect-square rounded-[4px] transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-ring" style={{ background: color(p.status) }} />
          ))}
        </div>
      )}
    </section>
  );
}

function PodDrawer({ pod, onClose }: { pod: K8sPod | null; onClose: () => void }) {
  if (!pod) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Pod ${pod.name}`}>
      <button aria-label="Close" className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <aside className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-6 shadow-xl sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:w-[400px] sm:rounded-none">
        <div className="flex items-start justify-between gap-2"><h3 className="font-mono text-sm font-medium break-all">{pod.name}</h3><Button variant="ghost" size="icon" className="size-10" aria-label="Close pod details" onClick={onClose}><X /></Button></div>
        <dl className="mt-6 space-y-4 text-sm">
          {[["Namespace", pod.namespace], ["Status", pod.status], ["Restarts", `${pod.restarts}`]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-6 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">Simulated pod data — derived deterministically from the resource dataset.</p>
      </aside>
    </div>
  );
}

/* ---------- Budget forecast ---------- */
export function BudgetForecast() {
  const q = useBudget();
  const amount = useSession((s) => s.settings.budgetAmount);
  const setAmount = (n: number) => setSession((s) => ({ ...s, settings: { ...s.settings, budgetAmount: n } }));
  const [draft, setDraft] = useState<string | null>(null);
  if (q.isPending) return <CardSkeleton h="h-64" />;
  if (q.isError || !q.data) return <ErrorState message="We couldn't load the budget. Try again." onRetry={() => q.refetch()} />;
  const b = q.data;
  const pct = Math.min(100, (b.spendToDate / amount) * 100);
  const projPct = (b.projectedEom / amount) * 100;
  const barColor = pct >= 100 ? "var(--destructive)" : pct >= 80 ? "var(--warning)" : "var(--chart-1)";
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) { setAmount(Math.round(n)); toast.success(`Budget set to ${fmtMoney(Math.round(n))}`); }
    setDraft(null);
  };
  return (
    <section className="organic-card p-6" aria-label="Budget and forecast">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Label>Budget & forecast</Label><p className="mt-1 text-[13px] text-muted-foreground">Spend to date and projection use the same aggregate as Overview</p></div>
        {draft === null ? (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setDraft(String(amount))}><Pencil className="size-3.5" />Edit budget</Button>
        ) : (
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); commit(); }}>
            <Input autoFocus type="number" min={1} value={draft} onChange={(e) => setDraft(e.target.value)} className="h-9 w-32" aria-label="Budget amount" />
            <Button size="sm" className="h-9" type="submit">Save</Button>
          </form>
        )}
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Spend to date</p><p className="metric-numbers mt-1 text-2xl"><AnimatedNumber value={b.spendToDate} format={(n) => fmtMoney(n)} /></p></div>
        <div><p className="text-xs text-muted-foreground">Projected end of period</p><p className="metric-numbers mt-1 text-2xl"><AnimatedNumber value={b.projectedEom} format={(n) => fmtMoney(n)} /></p></div>
        <div><p className="text-xs text-muted-foreground">Budget</p><p className="metric-numbers mt-1 text-2xl">{fmtMoney(amount)}</p></div>
      </div>
      <div className="mt-6">
        <div className="flex justify-between text-xs text-muted-foreground"><span>{pct.toFixed(0)}% of budget used</span><span className={projPct > 100 ? "text-destructive" : ""}>projection {projPct.toFixed(0)}%</span></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full origin-left rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${pct / 100})`, background: barColor }} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Default budget = 105% of last quarter's monthly average ({fmtMoney(b.defaultBudget)}). Demo setting — stored for this session only.</p>
      </div>
    </section>
  );
}

/* ---------- What-if simulator ---------- */
export function WhatIfSimulator() {
  const d = useDashboardData();
  const sim = d.simulator;
  const [ri, setRi] = useState(40);
  const [mig, setMig] = useState(20);
  const [right, setRight] = useState(50);
  const baseline = sim.baseline;
  const riSave = sim.riEligible * (ri / 100) * 0.3;
  const migSave = sim.migrationEligible * (mig / 100) * (1 - sim.migrationTargetIndex);
  const rightSave = sim.rightsizingSavings * (right / 100);
  const co2Save = sim.migrationCo2 * (mig / 100) * (1 - sim.migrationTargetIntensity / sim.migrationAvgIntensity);
  const projected = baseline - riSave - migSave - rightSave;
  const savings = baseline - projected;
  const [open, setOpen] = useState(false);
  const Slider = ({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint: string }) => (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="metric-numbers">{value}%</span></div>
      <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="mt-2 h-10 w-full accent-[var(--primary)]" />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
  const bar = (v: number, max: number, color: string) => (
    <div className="h-6 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full transition-transform duration-300" style={{ transform: `scaleX(${max ? v / max : 0})`, transformOrigin: "left", background: color }} /></div>
  );
  return (
    <section className="organic-card p-6" aria-label="What-if simulator">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><Label>What-if simulator</Label><p className="mt-1 text-[13px] text-muted-foreground">Baseline is the total spend for your active filters ({fmtMoney(baseline)})</p></div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" aria-expanded={open} onClick={() => setOpen(!open)}>Assumptions <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} /></Button>
      </div>
      {open && (
        <div className="mt-4 space-y-2 rounded-xl bg-secondary p-4 text-xs text-muted-foreground">
          <p>• Reserved instances: 30% discount on the compute share you move (eligible {fmtMoney(sim.riEligible)}/mo).</p>
          <p>• Region migration: uses the same regional cost index as Sustainability; target index {sim.migrationTargetIndex} (eligible {fmtMoney(sim.migrationEligible)}/mo).</p>
          <p>• Rightsizing: same rightsizeSaving() rule as Recommendations, scaled by the slider (full potential {fmtMoney(sim.rightsizingSavings)}/mo).</p>
          <p>All results are estimates based on demo data.</p>
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Slider label="Move compute to reserved instances" value={ri} onChange={setRi} hint={`Saves ${fmtMoney(riSave)}/mo`} />
          <Slider label="Migrate workloads to greener region" value={mig} onChange={setMig} hint={`Saves ${fmtMoney(migSave)}/mo and ${co2Save.toFixed(1)} t CO₂e`} />
          <Slider label="Apply rightsizing recommendations" value={right} onChange={setRight} hint={`Saves ${fmtMoney(rightSave)}/mo`} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3"><span className="w-28 text-xs text-muted-foreground">Baseline</span>{bar(baseline, baseline, "var(--muted-foreground)")}<span className="metric-numbers w-24 text-right text-sm">{fmtMoneyCompact(baseline)}</span></div>
          <div className="flex items-center gap-3"><span className="w-28 text-xs text-muted-foreground">Projected</span>{bar(projected, baseline, "var(--chart-1)")}<span className="metric-numbers w-24 text-right text-sm">{fmtMoneyCompact(projected)}</span></div>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-xs text-muted-foreground">Monthly savings</p>
            <p className="metric-numbers mt-1 text-2xl text-success"><AnimatedNumber value={savings} format={(n) => fmtMoney(n)} /> <span className="text-sm text-muted-foreground">({baseline ? ((savings / baseline) * 100).toFixed(1) : "0.0"}%)</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Live telemetry (simulated) ---------- */
export function LiveFeed() {
  const [events, setEvents] = useState<{ t: string; msg: string }[]>([{ t: "now", msg: "Stream connected" }]);
  const n = useRef(0);
  useEffect(() => {
    const msgs = ["pod autoscaled +2 on prod-api", "node pool rebalanced", "image pull backlog cleared", "HPA target lowered to 65%", "spot node reclaimed, rescheduling"];
    const id = setInterval(() => {
      n.current += 1;
      setEvents((e) => [{ t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), msg: msgs[n.current % msgs.length]! }, ...e].slice(0, 6));
    }, 8000);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="organic-card p-6" aria-label="Live activity">
      <div className="flex items-center justify-between"><Label>Live activity</Label><Badge variant="outline" className="gap-1.5"><span className="size-1.5 animate-pulse rounded-full bg-success" />Demo telemetry</Badge></div>
      <ul className="mt-4 space-y-2.5">
        {events.map((e, i) => <li key={i} className="flex gap-3 text-sm"><span className="metric-numbers shrink-0 text-xs text-muted-foreground">{e.t}</span><span>{e.msg}</span></li>)}
      </ul>
      <p className="mt-4 text-[11px] text-muted-foreground">Simulated events, added every ~8 seconds. Not real cluster data.</p>
    </section>
  );
}

/** Compact gauges row for the Kubernetes "live" tab — simulated CPU/memory. */
export function LiveGauges() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);
  const vals = [42 + Math.sin(tick / 2) * 9, 61 + Math.cos(tick / 3) * 7, 35 + Math.sin(tick / 4) * 6];
  return (
    <section className="organic-card p-6" aria-label="Cluster utilization">
      <div className="flex items-center justify-between"><Label>Utilization</Label><Badge variant="outline">Demo telemetry</Badge></div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        {["CPU", "Memory", "Storage"].map((l, i) => (
          <div key={l} className="text-center">
            <div className="relative mx-auto size-20">
              <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--secondary)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--chart-1)" strokeWidth="3" strokeDasharray={`${vals[i]} 100`} strokeLinecap="round" className="transition-all duration-700" />
              </svg>
              <span className="metric-numbers absolute inset-0 grid place-items-center text-sm">{Math.round(vals[i] ?? 0)}%</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Link card used on the Kubernetes live tab. */
export function LiveLinks() {
  return (
    <section className="organic-card flex flex-col gap-3 p-6" aria-label="Related">
      <Label>Related views</Label>
      <Link to="/resources" search={(prev: Record<string, unknown>) => ({ ...prev, tab: "list" })} className="group flex items-center justify-between rounded-xl bg-secondary p-4 text-sm transition-colors hover:bg-accent"><span className="inline-flex items-center gap-2"><Server className="size-4 text-muted-foreground" />All compute resources</span><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
      <Link to="/budgets" search={(prev: Record<string, unknown>) => ({ ...prev, tab: "forecast" })} className="group flex items-center justify-between rounded-xl bg-secondary p-4 text-sm transition-colors hover:bg-accent"><span className="inline-flex items-center gap-2"><Gauge className="size-4 text-muted-foreground" />Budget forecast</span><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
      <Link to="/cost-explorer" search={(prev: Record<string, unknown>) => ({ ...prev, tab: "explore" })} className="group flex items-center justify-between rounded-xl bg-secondary p-4 text-sm transition-colors hover:bg-accent"><span className="inline-flex items-center gap-2"><Container className="size-4 text-muted-foreground" />Spend by service</span><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
    </section>
  );
}
