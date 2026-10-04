import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BellPlus, Bot, ChevronRight, Download, EyeOff, FileJson, FileSpreadsheet, FileText, UserPlus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/finops-data";
import { byRegion, byService, cluster, dailySpend, envShare, platformKpis, providerShare, rangeLabels, recommendations, spark, tickerSeed, type CloudId, type Env, type PlatformRange } from "@/lib/finops-platform-data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { CountUp, Tilt } from "./Insights";
import { unitExtra } from "@/lib/finops-insights-data";

export interface Filters { range: PlatformRange; providers: CloudId[]; env: Env | "All" }
export const scaleOf = (f: Filters) => f.providers.reduce((s, p) => s + providerShare[p], 0) * (f.env === "All" ? 1 : envShare[f.env]);

const Label = ({ children }: { children: ReactNode }) => <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{children}</p>;
const Pill = ({ tone, children }: { tone: "success" | "warning" | "destructive" | "muted"; children: ReactNode }) => {
  const c = { success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning", destructive: "bg-destructive-soft text-destructive", muted: "bg-secondary text-muted-foreground" }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
};
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const card = "organic-card p-6";
const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

/* ---------- Filter bar ---------- */
export function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const all: CloudId[] = ["AWS", "Azure", "GCP"];
  const multi = filters.providers.length === 3;
  const toggle = (p: CloudId) => {
    const next = filters.providers.includes(p) ? filters.providers.filter((x) => x !== p) : [...filters.providers, p];
    onChange({ ...filters, providers: next.length ? next : [p] });
  };
  const exportAs = (kind: "PDF" | "CSV" | "JSON") => {
    if (kind === "PDF") { window.print(); return; }
    const rows = byService.map((s) => ({ service: s.name, cost: Math.round(s.value * scaleOf(filters)) }));
    const body = kind === "JSON" ? JSON.stringify({ filters, rows }, null, 2) : ["service,cost", ...rows.map((r) => `${r.service},${r.cost}`)].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: kind === "JSON" ? "application/json" : "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `nimbusops-report.${kind.toLowerCase()}` });
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${kind} report exported`);
  };
  return (
    <div className="organic-card flex flex-wrap items-center gap-3 p-3">
      <Select value={filters.range} onValueChange={(v) => { onChange({ ...filters, range: v as PlatformRange }); if (v === "custom") toast("Custom range: Sep 4 – Oct 3, 2026"); }}>
        <SelectTrigger className="h-9 w-[170px] rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(rangeLabels) as PlatformRange[]).map((r) => <SelectItem key={r} value={r}>{rangeLabels[r]}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          <button onClick={() => onChange({ ...filters, providers: all })} className={`rounded-lg px-2.5 py-1 text-xs transition-[transform,background-color,color] duration-200 active:scale-95 ${multi ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Multi-Cloud</button>
        {all.map((p) => (
          <button key={p} onClick={() => toggle(p)} aria-pressed={filters.providers.includes(p)} className={`rounded-lg px-2.5 py-1 text-xs transition-[transform,background-color,color] duration-200 active:scale-95 ${filters.providers.includes(p) && !multi ? "bg-accent text-foreground" : filters.providers.includes(p) ? "text-foreground hover:bg-accent/50" : "text-muted-foreground/60 line-through hover:text-muted-foreground"}`}>{p}</button>
        ))}
      </div>
      <Select value={filters.env} onValueChange={(v) => onChange({ ...filters, env: v as Env | "All" })}>
        <SelectTrigger className="h-9 w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>{["All", "Production", "Staging", "Development"].map((e) => <SelectItem key={e} value={e}>{e === "All" ? "All environments" : e}</SelectItem>)}</SelectContent>
      </Select>
      <div className="ml-auto flex gap-2">
        <BudgetAlertDialog />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="secondary" className="rounded-xl"><Download />Export report</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportAs("PDF")}><FileText />PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAs("CSV")}><FileSpreadsheet />CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAs("JSON")}><FileJson />JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function BudgetAlertDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Q4 production budget");
  const [amount, setAmount] = useState("300000");
  const [threshold, setThreshold] = useState(80);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-xl"><BellPlus />Create budget alert</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create budget alert</DialogTitle><DialogDescription>Get notified when spend crosses a threshold.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Alert name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Budget (USD)</Label><Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-3"><div className="flex justify-between"><Label>Warn at</Label><span className="metric-numbers text-sm">{threshold}% · {fmtUSD((Number(amount) || 0) * threshold / 100)}</span></div><Slider value={[threshold]} min={50} max={100} step={5} onValueChange={([v]) => setThreshold(v ?? 80)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!name.trim() || !(Number(amount) > 0)} onClick={() => { setOpen(false); toast.success(`Alert "${name}" set at ${threshold}%`); }}>Save alert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Detail drawer ---------- */
export type Detail = { title: string; description: string; rows: [string, string][] } | null;
export function DetailDrawer({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  return (
    <Sheet open={!!detail} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        {detail && <>
          <SheetHeader><SheetTitle>{detail.title}</SheetTitle><SheetDescription>{detail.description}</SheetDescription></SheetHeader>
          <dl className="mt-2 divide-y divide-border px-4">
            {detail.rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="metric-numbers text-right">{v}</dd></div>)}
          </dl>
        </>}
      </SheetContent>
    </Sheet>
  );
}

function Spark({ seed, color }: { seed: number; color: string }) {
  const data = useMemo(() => spark(seed), [seed]);
  return <div className="h-10 w-24"><ResponsiveContainer><LineChart data={data}><Line dataKey="v" stroke={color} strokeWidth={1.5} dot={false} animationDuration={700} animationEasing="ease-out" /></LineChart></ResponsiveContainer></div>;
}

/* ---------- KPI cards ---------- */
export function DenseKpis({ scale, onOpen }: { scale: number; onOpen: (d: Detail) => void }) {
  const k = platformKpis;
  const s = (n: number) => fmtUSD(n * scale);
  const items = [
    { label: "Total monthly spend", n: k.spend.total * scale, f: (n: number) => fmtUSD(n), value: "", pill: <Pill tone="warning">+{k.spend.mom}% MoM</Pill>, color: "var(--chart-1)", seed: 1,
      subs: [["Daily burn", `${s(k.spend.burn)}/day`], ["EOM projection", s(k.spend.projected)]],
      detail: { title: "Total monthly spend", description: "Month-to-date spend across selected clouds.", rows: [["MTD spend", s(k.spend.total)], ["Month over month", `+${k.spend.mom}%`], ["Daily burn rate", s(k.spend.burn)], ["Projected end of month", s(k.spend.projected)], ["Budget remaining", s(300_000 - k.spend.projected)]] } },
    { label: "Idle resource waste", n: k.waste.total * scale, f: (n: number) => `${fmtUSD(n)}/mo`, value: "", pill: <Pill tone="warning">34 resources</Pill>, color: "var(--chart-3)", seed: 2,
      subs: [["Unattached EBS", `${k.waste.ebs}`], ["Idle RDS · Oversized EC2", `${k.waste.rds} · ${k.waste.ec2}`]],
      detail: { title: "Idle resource waste", description: "Resources costing money without doing work.", rows: [["Unattached EBS volumes", `${k.waste.ebs}`], ["Idle RDS instances", `${k.waste.rds}`], ["Oversized EC2 nodes", `${k.waste.ec2}`], ["Monthly waste", s(k.waste.total)]] } },
    { label: "Cost anomalies", n: k.anomalies.length, f: (n: number) => `${Math.round(n)} active`, value: "", pill: <Pill tone="destructive">Critical</Pill>, color: "var(--destructive)", seed: 3,
      subs: [["Top spike", `+${k.anomalies[0]!.change}% Blob egress`], ["Est. impact", s(k.anomalies.reduce((a, b) => a + b.impact, 0))]],
      detail: { title: "Cost anomalies", description: "Detected spend deviations from the 30-day baseline.", rows: k.anomalies.flatMap((a) => [[a.title, `+${a.change}%`], [`Impact · since ${a.since}`, fmtUSD(a.impact)]] as [string, string][]) } },
    { label: "Unit economics", n: k.unit.perUser * Math.max(0.6, scale), f: (n: number) => `$${n.toFixed(3)}`, value: "", pill: <Pill tone="success">per active user</Pill>, color: "var(--chart-2)", seed: 4,
      subs: [["Per API request", `$${k.unit.perRequest.toFixed(5)}`], ["Per deployment", `$${unitExtra.perDeployment.toFixed(2)}`], ["Per active session", `$${unitExtra.perSession.toFixed(3)}`], ["Active users", (k.unit.activeUsers / 1e6).toFixed(2) + "M"]],
      detail: { title: "Unit economics", description: "Cloud cost normalized by business volume.", rows: [["Cost per active user", `$${k.unit.perUser}`], ["Cost per API request", `$${k.unit.perRequest}`], ["Cost per deployment", `$${unitExtra.perDeployment}`], ["Cost per active session", `$${unitExtra.perSession}`], ["Active users (30d)", k.unit.activeUsers.toLocaleString("en-US")], ["API requests (30d)", k.unit.requests.toLocaleString("en-US")]] } },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((it) => (
        <Tilt key={it.label}><button onClick={() => onOpen(it.detail as Detail)} className={`${card} subtle-lift group h-full w-full text-left`}>
          <div className="flex items-center justify-between"><Label>{it.label}</Label><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
          <div className="mt-3 flex items-end justify-between gap-2"><p className="metric-numbers whitespace-nowrap text-2xl 2xl:text-3xl"><CountUp value={it.n} format={it.f} /></p><Spark seed={it.seed} color={it.color} /></div>
          <div className="mt-2">{it.pill}</div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            {it.subs.map(([a, b]) => <div key={a}><dt className="text-[11px] text-muted-foreground">{a}</dt><dd className="metric-numbers mt-0.5 text-sm">{b}</dd></div>)}
          </dl>
        </button></Tilt>
      ))}
    </section>
  );
}

/* ---------- Cost distribution ---------- */
type View = "service" | "region" | "daily";
export function CostDistribution({ scale, providers }: { scale: number; providers: CloudId[] }) {
  const [view, setView] = useState<View>("service");
  const services = byService.map((s) => ({ ...s, value: Math.round(s.value * scale) }));
  const total = services.reduce((a, b) => a + b.value, 0);
  const daily = dailySpend.map((d) => ({ ...d, spend: Math.round(d.spend * scale) }));
  const pct = (v: number) => `${((v / total) * 100).toFixed(1)}%`;
  return (
    <article className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Label>Cost distribution</Label><p className="metric-numbers mt-1 text-2xl">{fmtUSD(total)}</p></div>
        <div className="flex rounded-xl bg-secondary p-1">
          {([["service", "By service"], ["region", "By region"], ["daily", "Daily trend"]] as [View, string][]).map(([v, l]) => (
             <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1 text-xs transition-[transform,background-color,color] duration-200 active:scale-95 ${view === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-80">
        {view === "service" && (
          <div key="service" className="animate-in fade-in zoom-in-95 grid h-full gap-6 duration-300 md:grid-cols-[1fr_220px]">
            <ResponsiveContainer><PieChart><Pie data={services} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">{services.map((_, i) => <Cell key={i} fill={chartColors[i] ?? "var(--chart-4)"} />)}</Pie><Tooltip contentStyle={tip} formatter={(v) => [`${fmtUSD(Number(v))} · ${pct(Number(v))}`, "Cost"]} /></PieChart></ResponsiveContainer>
            <ul className="hidden flex-col justify-center gap-3 md:flex">{services.map((s, i) => <li key={s.name} className="flex items-center gap-2 text-sm"><span className="size-2 rounded-full" style={{ background: chartColors[i] }} /><span className="flex-1 text-muted-foreground">{s.name}</span><span className="metric-numbers">{pct(s.value)}</span></li>)}</ul>
          </div>
        )}
        {view === "region" && (
          <div key="region" className="animate-in fade-in h-full duration-300"><ResponsiveContainer><BarChart data={byRegion.map((r) => ({ region: r.region, AWS: r.AWS * scale, Azure: r.Azure * scale, GCP: r.GCP * scale }))}>
            <CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="region" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
            <Tooltip contentStyle={tip} cursor={{ fill: "var(--secondary)" }} formatter={(v, n) => [fmtUSD(Number(v)), String(n)]} />
            {providers.includes("AWS") && <Bar dataKey="AWS" stackId="a" fill="var(--aws)" />}
            {providers.includes("Azure") && <Bar dataKey="Azure" stackId="a" fill="var(--azure)" />}
            {providers.includes("GCP") && <Bar dataKey="GCP" stackId="a" fill="var(--gcp)" radius={[6, 6, 0, 0]} />}
          </BarChart></ResponsiveContainer></div>
        )}
        {view === "daily" && (
          <div key="daily" className="animate-in fade-in h-full duration-300"><ResponsiveContainer><AreaChart data={daily}>
            <defs><linearGradient id="dg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.35} /><stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} interval={4} /><YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={tip} formatter={(v) => [fmtUSD(Number(v)), "Spend"]} />
            <Area dataKey="spend" stroke="var(--chart-1)" strokeWidth={2} fill="url(#dg)" />
          </AreaChart></ResponsiveContainer></div>
        )}
      </div>
    </article>
  );
}

/* ---------- Savings feed ---------- */
type RecState = "open" | "remediating" | "done" | "assigned" | "ignored";
export function SavingsFeed() {
  const [state, setState] = useState<Record<string, RecState>>({});
  const active = recommendations.filter((r) => (state[r.id] ?? "open") !== "ignored" && state[r.id] !== "done");
  const realized = recommendations.filter((r) => state[r.id] === "done").reduce((a, b) => a + b.savings, 0);
  const pending = active.reduce((a, b) => a + b.savings, 0);
  const [confirm, setConfirm] = useState<(typeof recommendations)[number] | null>(null);
  const remediate = (id: string) => { setState((s) => ({ ...s, [id]: "remediating" })); window.setTimeout(() => { setState((s) => ({ ...s, [id]: "done" })); toast.success("Remediation applied"); }, 1200); };
  return (
    <article className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Label>Optimization recommendations</Label><p className="mt-1 text-sm text-muted-foreground">Executing all open actions saves <span className="metric-numbers text-foreground">{fmtUSD(pending)}/month</span></p></div>
        <div className="text-right"><Label>Realized</Label><p className="metric-numbers mt-1 text-xl text-success">{fmtUSD(realized)}</p></div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="progress-reveal h-full rounded-full bg-success transition-all duration-700" style={{ width: `${(realized / 18_400) * 100}%` }} /></div>
      <ul className="mt-5 divide-y divide-border">
        {recommendations.map((r) => {
          const st = state[r.id] ?? "open";
          return (
             <li key={r.id} className={`flex flex-col gap-3 py-4 transition-[opacity,transform] duration-300 lg:flex-row lg:items-center ${st === "ignored" ? "translate-x-1 opacity-40" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{r.title}</p><Pill tone={r.impact === "High Impact" ? "warning" : "success"}>{r.impact}</Pill>{st === "assigned" && <Pill tone="muted">Assigned · {r.team}</Pill>}{st === "done" && <Pill tone="success">Remediated</Pill>}</div>
                <p className="mt-1 text-xs text-muted-foreground">{r.detail} · <span className="metric-numbers">{fmtUSD(r.savings)}/mo</span></p>
              </div>
              {st !== "done" && st !== "ignored" && (
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" disabled={st === "remediating"} onClick={() => setConfirm(r)}><Wand2 />{st === "remediating" ? "Applying…" : "Remediate waste"}</Button>
                  <Button size="sm" variant="secondary" disabled={st === "assigned"} onClick={() => { setState((s) => ({ ...s, [r.id]: "assigned" })); toast(`Assigned to ${r.team} team`); }}><UserPlus />Assign</Button>
                  <Button size="icon" variant="ghost" className="size-8" aria-label="Ignore" onClick={() => setState((s) => ({ ...s, [r.id]: "ignored" }))}><EyeOff /></Button>
                </div>
              )}
              {st === "ignored" && <Button size="sm" variant="ghost" onClick={() => setState((s) => ({ ...s, [r.id]: "open" }))}>Restore</Button>}
            </li>
          );
        })}
      </ul>
      <Sheet open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {confirm && (<>
            <SheetHeader><SheetTitle>Confirm remediation</SheetTitle><SheetDescription>{confirm.title}</SheetDescription></SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-success-soft p-4"><Label>This action</Label><p className="metric-numbers mt-1 text-xl text-success">{fmtUSD(confirm.savings)}/mo</p></div>
                <div className="rounded-xl bg-secondary p-4"><Label>All open actions</Label><p className="metric-numbers mt-1 text-xl">$18,400/mo</p></div>
              </div>
              <div><Label>CLI preview</Label><pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{`$ nimbus remediate --id ${confirm.id} \\
    --team ${confirm.team.toLowerCase()} --dry-run=false
✓ plan: ${confirm.detail}`}</pre></div>
              <div><Label>Terraform preview</Label><pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{`resource "nimbus_optimization" "${confirm.id}" {
  action      = "apply"
  owner_team  = "${confirm.team}"
  max_savings = ${confirm.savings}
  # ${confirm.title}
}`}</pre></div>
              <div className="flex gap-2"><Button className="flex-1" onClick={() => { remediate(confirm.id); setConfirm(null); }}><Wand2 />Apply remediation</Button><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button></div>
            </div>
          </>)}
        </SheetContent>
      </Sheet>
    </article>
  );
}

/* ---------- Kubernetes health ---------- */
export function K8sHealth({ onOpen }: { onOpen: (d: Detail) => void }) {
  const [cpu, setCpu] = useState(cluster.cpu);
  const [mem, setMem] = useState(cluster.memory);
  const [ticker, setTicker] = useState(() => tickerSeed.slice(0, 4).map((t, i) => ({ t, ago: [12, 26, 41, 58][i]! })));
  useEffect(() => {
    const id = window.setInterval(() => {
      setCpu((v) => Math.min(92, Math.max(60, v + Math.round((Math.random() - 0.5) * 4))));
      setMem((v) => Math.min(85, Math.max(50, v + Math.round((Math.random() - 0.5) * 3))));
      setTicker((list) => [{ t: tickerSeed[Math.floor(Math.random() * tickerSeed.length)]!, ago: 0 }, ...list.map((x) => ({ ...x, ago: x.ago + 1 }))].slice(0, 5));
    }, 6000);
    return () => window.clearInterval(id);
  }, []);
  const bars = [["CPU allocation", cpu, cpu > 85 ? "var(--warning)" : "var(--chart-1)", `${cpu}%`], ["Memory utilization", mem, "var(--chart-2)", `${mem}%`], ["Pod health", (cluster.podsHealthy / cluster.podsTotal) * 100, "var(--success)", `${cluster.podsHealthy}/${cluster.podsTotal}`]] as const;
  return (
    <article className={`${card} flex h-full flex-col`}>
      <button className="flex w-full items-start justify-between text-left" onClick={() => onOpen({ title: cluster.name, description: "Kubernetes cluster details", rows: [["Region", cluster.region], ["Version", cluster.version], ["Nodes", `${cluster.nodes}`], ["CPU allocation", `${cpu}%`], ["Memory utilization", `${mem}%`], ["Pods healthy", `${cluster.podsHealthy}/${cluster.podsTotal}`], ["Pods pending", "2 (ImagePullBackOff)"]] })}>
        <div><Label>Kubernetes cluster</Label><p className="mt-1 font-medium">{cluster.name}</p><p className="metric-numbers text-xs text-muted-foreground">{cluster.region} · {cluster.version} · {cluster.nodes} nodes</p></div>
        <Pill tone="success"><span className="pulse-dot mr-1.5 size-1.5 rounded-full bg-success text-success" />Healthy</Pill>
      </button>
      <div className="mt-6 space-y-4">
        {bars.map(([l, v, c, t]) => (
          <div key={l}><div className="flex justify-between text-xs"><span className="text-muted-foreground">{l}</span><span className="metric-numbers">{t}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="progress-reveal h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: c }} /></div></div>
        ))}
      </div>
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-center gap-2"><Bot className="size-3.5 text-muted-foreground" /><Label>Live automation</Label></div>
        <ul className="mt-3 space-y-2.5">
          {ticker.map((x, i) => <li key={`${x.t}-${i}-${x.ago}`} className={`flex justify-between gap-3 text-xs ${i === 0 ? "animate-in fade-in slide-in-from-top-1 duration-300" : ""}`}><span className={i === 0 ? "text-foreground" : "text-muted-foreground"}>{x.t}</span><span className="metric-numbers shrink-0 text-muted-foreground">{x.ago === 0 ? "now" : `${x.ago}m ago`}</span></li>)}
        </ul>
      </div>
    </article>
  );
}

export function AnomalyStrip({ onOpen }: { onOpen: (d: Detail) => void }) {
  const a = platformKpis.anomalies[0]!;
  return (
    <button onClick={() => onOpen({ title: a.title, description: "Anomaly detected against 30-day baseline.", rows: [["Change", `+${a.change}%`], ["Est. monthly impact", fmtUSD(a.impact)], ["Detected", a.since], ["Suggested action", "Enable CDN caching for media container"]] })} className="group flex w-full items-center gap-3 rounded-2xl bg-destructive-soft px-4 py-2.5 text-left text-sm transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-destructive-soft/80 active:scale-[0.99]">
      <AlertTriangle className="size-4 shrink-0 text-destructive" />
      <span className="flex-1"><span className="font-medium text-destructive">Anomaly:</span> <span className="text-foreground">Unexpected +{a.change}% spike in Azure Blob Storage egress fees</span></span>
      <ChevronRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
    </button>
  );
}
