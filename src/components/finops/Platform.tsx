import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from "recharts";
import { SlidersHorizontal, AlertTriangle, BellPlus, Bot, ChevronRight, Download, EyeOff, FileJson, FileSpreadsheet, FileText, UserPlus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { fmtUSD } from "@/lib/finops-data";
import { rangeLabels, type CloudId, type Env, type PlatformRange } from "@/lib/finops-platform-data";
import { useDashboard, useDashboardData } from "@/lib/queries";
import { allProviders, teams, type Filters, type Team } from "@/lib/filters";
import { DataTableView, TableToggle } from "./States";
import type { RecommendationDto } from "@/types/finops";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { CountUp, Tilt } from "./Insights";

export type { Filters };

const Label = ({ children }: { children: ReactNode }) => <p className="font-mono text-[10px] text-muted-foreground">{children}</p>;
const Pill = ({ tone, children }: { tone: "success" | "warning" | "destructive" | "muted"; children: ReactNode }) => {
  const c = { success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning", destructive: "bg-destructive-soft text-destructive", muted: "bg-secondary text-muted-foreground" }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
};
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const card = "organic-card p-6";
const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

/* ---------- Filter bar ---------- */
export function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const all: CloudId[] = allProviders;
  const services = useDashboard().data?.services ?? [];
  const multi = filters.providers.length === 3;
  const toggle = (p: CloudId) => {
    const next = filters.providers.includes(p) ? filters.providers.filter((x) => x !== p) : [...filters.providers, p];
    onChange({ ...filters, providers: next.length ? next : [p] });
  };
  const exportAs = (kind: "PDF" | "CSV" | "JSON") => {
    if (kind === "PDF") { window.print(); return; }
    const rows = services.map((s) => ({ service: s.name, cost: s.value }));
    const body = kind === "JSON" ? JSON.stringify({ filters, rows }, null, 2) : ["service,cost", ...rows.map((r) => `${r.service},${r.cost}`)].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: kind === "JSON" ? "application/json" : "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `nimbusops-report.${kind.toLowerCase()}` });
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${kind} report exported`);
  };
  return (
    <div className="organic-card flex flex-wrap items-center gap-3 p-3 xl:flex-nowrap [&>*]:shrink-0">
      <Select value={filters.range} onValueChange={(v) => { onChange({ ...filters, range: v as PlatformRange }); if (v === "custom") toast("Custom range: Sep 4 – Oct 3, 2026"); }}>
        <SelectTrigger className="h-9 w-[150px] rounded-xl" aria-label="Date range"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(rangeLabels) as PlatformRange[]).map((r) => <SelectItem key={r} value={r}>{rangeLabels[r]}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          <button onClick={() => onChange({ ...filters, providers: all })} className={`rounded-lg px-2.5 py-1 text-xs transition-[transform,background-color,color] duration-200 active:scale-95 ${multi ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Multi-Cloud</button>
        {all.map((p) => (
          <button key={p} onClick={() => toggle(p)} aria-pressed={filters.providers.includes(p)} className={`rounded-lg px-2.5 py-1 text-xs transition-[transform,background-color,color] duration-200 active:scale-95 ${filters.providers.includes(p) && !multi ? "bg-accent text-foreground" : filters.providers.includes(p) ? "text-foreground hover:bg-accent/50" : "text-muted-foreground/60 line-through hover:text-muted-foreground"}`}>{p}</button>
        ))}
      </div>
      <Select value={filters.env} onValueChange={(v) => onChange({ ...filters, env: v as Env | "All" })}>
        <SelectTrigger className="h-9 w-[150px] rounded-xl" aria-label="Environment"><SelectValue /></SelectTrigger>
        <SelectContent>{["All", "Production", "Staging", "Development"].map((e) => <SelectItem key={e} value={e}>{e === "All" ? "All environments" : e}</SelectItem>)}</SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild><Button variant="secondary" className="h-9 shrink-0 rounded-xl"><SlidersHorizontal />More filters{filters.team !== "All" && <span className="rounded-full bg-accent px-1.5 text-[10px]">1</span>}</Button></PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-3">
          <Label>Team</Label>
          <Select value={filters.team} onValueChange={(v) => onChange({ ...filters, team: v as Team | "All" })}>
            <SelectTrigger className="h-9 w-full rounded-xl" aria-label="Team"><SelectValue /></SelectTrigger>
            <SelectContent>{["All", ...teams].map((t) => <SelectItem key={t} value={t}>{t === "All" ? "All teams" : t}</SelectItem>)}</SelectContent>
          </Select>
        </PopoverContent>
      </Popover>
      <div className="ml-auto flex gap-2">
        <BudgetAlertDialog />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="secondary" className="rounded-xl"><Download /><span className="hidden 2xl:inline">Export report</span><span className="2xl:hidden">Export</span></Button></DropdownMenuTrigger>
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
      <DialogTrigger asChild><Button className="rounded-xl"><BellPlus /><span className="hidden 2xl:inline">Create budget alert</span><span className="2xl:hidden">Budget alert</span></Button></DialogTrigger>
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

export function Spark({ data: raw, color, className = "h-10 w-24" }: { data: number[]; color: string; className?: string }) {
  const data = useMemo(() => raw.map((v, i) => ({ i, v })), [raw]);
  return <div className={className} aria-hidden><ResponsiveContainer><LineChart data={data}><Line dataKey="v" stroke={color} strokeWidth={1.5} dot={false} animationDuration={700} animationEasing="ease-out" /></LineChart></ResponsiveContainer></div>;
}

/* ---------- KPI cards ---------- */
export function DenseKpis({ onOpen }: { onOpen: (d: Detail) => void }) {
  const dd = useDashboardData(), k = dd.kpis, o = dd.overview;
  const unitExtra = k.unit;
  const top = k.anomalies[0];
  const s = (n: number) => fmtUSD(n);
  const items = [
    { label: "Total spend", n: k.spend.total, f: (n: number) => fmtUSD(n), value: "", pill: <Pill tone={k.spend.mom > 0 ? "warning" : "success"}>{k.spend.mom > 0 ? "+" : ""}{k.spend.mom}% vs prev.</Pill>, color: "var(--chart-1)", spark: o.totalSpend.spark,
      subs: [["Daily burn", `${s(k.spend.burn)}/day`], ["EOM projection", s(k.spend.projected)]],
      detail: { title: "Total monthly spend", description: "Month-to-date spend across selected clouds.", rows: [["MTD spend", s(k.spend.total)], ["Vs previous period", `${k.spend.mom > 0 ? "+" : ""}${k.spend.mom}%`], ["Daily burn rate", s(k.spend.burn)], ["Projected end of month", s(k.spend.projected)], ["Budget remaining", s(300_000 - k.spend.projected)]] } },
    { label: "Idle resource waste", n: k.waste.total, f: (n: number) => `${fmtUSD(n)}/mo`, value: "", pill: <Pill tone="warning">{o.idleCount} idle resources</Pill>, color: "var(--chart-3)", spark: o.idleWaste.spark,
      subs: [["Idle storage", `${k.waste.ebs}`], ["Idle DBs · Oversized", `${k.waste.rds} · ${k.waste.ec2}`]],
      detail: { title: "Idle resource waste", description: "Resources costing money without doing work.", rows: [["Idle resources", `${o.idleCount}`], ["Idle storage", `${k.waste.ebs}`], ["Idle databases", `${k.waste.rds}`], ["Oversized compute (CPU < 25%)", `${k.waste.ec2}`], ["Monthly waste", s(k.waste.total)]] } },
    { label: "Cost anomalies", n: k.anomalies.length, f: (n: number) => `${Math.round(n)} active`, value: "", pill: top ? <Pill tone="destructive">Critical</Pill> : <Pill tone="success">None</Pill>, color: "var(--destructive)", spark: o.anomalies.spark,
      subs: [["Top spike", top ? `+${top.change}% ${top.provider}` : "—"], ["Est. impact", s(k.anomalies.reduce((a, b) => a + b.impact, 0))]],
      detail: { title: "Cost anomalies", description: "Detected spend deviations from the 30-day baseline.", rows: k.anomalies.flatMap((a) => [[a.title, `+${a.change}%`], [`Impact · since ${a.since}`, fmtUSD(a.impact)]] as [string, string][]) } },
    { label: "Unit economics", n: k.unit.perUser, f: (n: number) => `$${n.toFixed(3)}`, value: "", pill: <Pill tone="success">per active user</Pill>, color: "var(--chart-2)", spark: o.costPerUser.spark,
      subs: [["Per API request", `$${k.unit.perRequest.toFixed(5)}`], ["Per deployment", `$${unitExtra.perDeployment.toFixed(2)}`], ["Per active session", `$${unitExtra.perSession.toFixed(3)}`], ["Active users", (k.unit.activeUsers / 1e6).toFixed(2) + "M"]],
      detail: { title: "Unit economics", description: "Cloud cost normalized by business volume.", rows: [["Cost per active user", `$${k.unit.perUser.toFixed(4)}`], ["Cost per API request", `$${k.unit.perRequest.toFixed(6)}`], ["Cost per deployment", `$${unitExtra.perDeployment.toFixed(2)}`], ["Cost per active session", `$${unitExtra.perSession.toFixed(4)}`], ["Active users (30d)", k.unit.activeUsers.toLocaleString("en-US")], ["API requests (30d)", k.unit.requests.toLocaleString("en-US")]] } },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((it) => (
        <Tilt key={it.label}><button onClick={() => onOpen(it.detail as Detail)} className={`${card} subtle-lift group h-full w-full text-left`}>
          <div className="flex items-center justify-between"><Label>{it.label}</Label><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
          <div className="mt-3 flex items-end justify-between gap-2"><p className="metric-numbers whitespace-nowrap text-2xl 2xl:text-3xl"><CountUp value={it.n} format={it.f} /></p><Spark data={it.spark} color={it.color} /></div>
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
type View = "service" | "region" | "team" | "daily";
export function CostDistribution() {
  const [view, setView] = useState<View>("service");
  const [asTable, setAsTable] = useState(false);
  const d = useDashboardData();
  const providers = d.providers;
  const services = d.services;
  const total = services.reduce((a, b) => a + b.value, 0);
  const daily = d.daily;
  const pct = (v: number) => `${((v / total) * 100).toFixed(1)}%`;
  const table = view === "service" ? { columns: ["Service", "Cost", "Share"], rows: services.map((s) => [s.name, fmtUSD(s.value), pct(s.value)]) } : view === "region" ? { columns: ["Region", ...providers], rows: d.regions.map((r) => [r.region, ...providers.map((p) => fmtUSD(r[p]))]) } : view === "team" ? { columns: ["Team", "Cost", "Share"], rows: d.teams.map((s) => [s.name, fmtUSD(s.value), pct(s.value)]) } : { columns: ["Day", "Spend"], rows: daily.map((x) => [x.day, fmtUSD(x.spend)]) };
  return (
    <article className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Label>Cost distribution</Label><p className="metric-numbers mt-1 text-2xl">{fmtUSD(total)}</p></div>
        <div className="flex flex-wrap items-center gap-2"><Link to="/cost-explorer" className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">Explore<ChevronRight className="size-3.5" /></Link><TableToggle on={asTable} onChange={setAsTable} /><div className="flex rounded-xl bg-secondary p-1">
          {([["service", "Donut · service"], ["region", "Stacked · region"], ["team", "Treemap · team"], ["daily", "Daily trend"]] as [View, string][]).map(([v, l]) => (
             <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1 text-xs transition-[transform,background-color,color] duration-200 active:scale-95 ${view === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div></div>
      </div>
      <div className="mt-6 h-80" aria-live="polite">
        {asTable && <DataTableView caption={`Cost distribution ${view}`} columns={table.columns} rows={table.rows} />}
        {!asTable && view === "service" && (
          <div key="service" className="animate-in fade-in zoom-in-95 grid h-full gap-6 duration-300 md:grid-cols-[1fr_220px]">
            <ResponsiveContainer><PieChart><Pie data={services} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">{services.map((_, i) => <Cell key={i} fill={chartColors[i] ?? "var(--chart-4)"} />)}</Pie><Tooltip contentStyle={tip} formatter={(v) => [`${fmtUSD(Number(v))} · ${pct(Number(v))}`, "Cost"]} /></PieChart></ResponsiveContainer>
            <ul className="hidden flex-col justify-center gap-3 md:flex">{services.map((s, i) => <li key={s.name} className="flex items-center gap-2 text-sm"><span className="size-2 rounded-full" style={{ background: chartColors[i] }} /><span className="flex-1 text-muted-foreground">{s.name}</span><span className="metric-numbers">{pct(s.value)}</span></li>)}</ul>
          </div>
        )}
        {!asTable && view === "region" && (
          <div key="region" className="animate-in fade-in h-full duration-300"><ResponsiveContainer><BarChart data={d.regions}>
            <CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="region" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
            <Tooltip contentStyle={tip} cursor={{ fill: "var(--secondary)" }} formatter={(v, n) => [fmtUSD(Number(v)), String(n)]} />
            {providers.includes("AWS") && <Bar dataKey="AWS" stackId="a" fill="var(--aws)" />}
            {providers.includes("Azure") && <Bar dataKey="Azure" stackId="a" fill="var(--azure)" />}
            {providers.includes("GCP") && <Bar dataKey="GCP" stackId="a" fill="var(--gcp)" radius={[6, 6, 0, 0]} />}
          </BarChart></ResponsiveContainer></div>
        )}
        {!asTable && view === "team" && (
          <div key="team" className="animate-in fade-in h-full duration-300"><ResponsiveContainer>
            <Treemap data={d.teams.map((t, i) => ({ ...t, fill: chartColors[i % chartColors.length] }))} dataKey="value" nameKey="name" stroke="var(--card)" isAnimationActive animationDuration={500}
              content={<TreeCell total={total} />}>
              <Tooltip contentStyle={tip} formatter={(v) => [`${fmtUSD(Number(v))} · ${pct(Number(v))}`, "Cost"]} />
            </Treemap>
          </ResponsiveContainer></div>
        )}
        {!asTable && view === "daily" && (
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

function TreeCell(p: { x?: number; y?: number; width?: number; height?: number; name?: string; value?: number; fill?: string; total: number }) {
  const { x = 0, y = 0, width = 0, height = 0, name, value = 0, fill, total } = p;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={10} fill={fill} fillOpacity={0.22} stroke="var(--card)" strokeWidth={3} />
      {width > 70 && height > 40 && <><text x={x + 12} y={y + 22} fill="var(--foreground)" fontSize={12}>{name}</text><text x={x + 12} y={y + 40} fill="var(--muted-foreground)" fontSize={11} fontFamily="var(--font-mono)">{fmtUSD(value)} · {total ? ((value / total) * 100).toFixed(1) : 0}%</text></>}
    </g>
  );
}

/* ---------- Savings feed ---------- */
type RecState = "open" | "remediating" | "done" | "assigned" | "ignored";
export function SavingsFeed() {
  const recommendations = useDashboardData().recommendations;
  const [state, setState] = useState<Record<string, RecState>>({});
  const active = recommendations.filter((r) => (state[r.id] ?? "open") !== "ignored" && state[r.id] !== "done");
  const realized = recommendations.filter((r) => state[r.id] === "done").reduce((a, b) => a + b.savings, 0);
  const pending = active.reduce((a, b) => a + b.savings, 0);
  const [confirm, setConfirm] = useState<RecommendationDto | null>(null);
  const remediate = (id: string) => { setState((s) => ({ ...s, [id]: "remediating" })); window.setTimeout(() => { setState((s) => ({ ...s, [id]: "done" })); toast.success("Remediation applied"); }, 1200); };
  return (
    <article className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Label>Optimization recommendations</Label><p className="mt-1 text-sm text-muted-foreground">Executing all open actions saves <span className="metric-numbers text-foreground">{fmtUSD(pending)}/month</span></p></div>
        <div className="text-right"><Label>Realized</Label><p className="metric-numbers mt-1 text-xl text-success">{fmtUSD(realized)}</p></div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="progress-reveal h-full rounded-full bg-success transition-all duration-700" style={{ width: `${(realized / 18_400) * 100}%` }} /></div>
      {recommendations.length === 0 && <p className="mt-6 rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">No recommendations for this team. Try "All teams" in the filters.</p>}
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
  const { cluster, ticker: tickerSeed } = useDashboardData();
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
  }, [tickerSeed]);
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
  const a = useDashboard().data?.kpis.anomalies[0];
  if (!a) return null;
  return (
    <button onClick={() => onOpen({ title: a.title, description: "Last 3 days vs the prior 14-day baseline.", rows: [["Change", `+${a.change}%`], ["Est. monthly impact", fmtUSD(a.impact)], ["Detected", a.since], ["Suggested action", "Enable CDN caching for media container"]] })} className="group flex w-full items-center gap-3 rounded-2xl bg-destructive-soft px-4 py-2.5 text-left text-sm transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-destructive-soft/80 active:scale-[0.99]">
      <AlertTriangle className="size-4 shrink-0 text-destructive" />
      <span className="flex-1"><span className="font-medium text-destructive">Anomaly:</span> <span className="text-foreground">Unexpected +{a.change}% spike in {a.title}</span></span>
      <ChevronRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
    </button>
  );
}
