import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownRight, ArrowUpRight, Check, ChevronRight, CircleAlert, Cpu, Database, MemoryStick, Search, Server, Sparkles } from "lucide-react";
import { allocation, fmtUSD, kpis, type CostPoint, type ResourceStatus } from "@/lib/finops-data";
import { useDashboardData } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const Label = ({ children }: { children: React.ReactNode }) => <p className="font-mono text-[10px] text-muted-foreground">{children}</p>;
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 14, fontSize: 12, color: "var(--foreground)" };

function Ring({ value, tone = "success", size = 96 }: { value: number; tone?: "success" | "warning"; size?: number }) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const color = tone === "success" ? "var(--success)" : "var(--warning)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 84 84" className="size-full -rotate-90" aria-label={`${value} percent`}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--muted)" strokeWidth="4" />
        <circle className="transition-[stroke-dashoffset] duration-700 ease-out" cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
      </svg>
      <span className="metric-numbers absolute inset-0 grid place-items-center text-sm font-medium">{value}%</span>
    </div>
  );
}

export function KpiCards() {
  const total = kpis.resources.vms + kpis.resources.containers + kpis.resources.databases;
  return (
    <section className="grid border-y border-foreground/25 sm:grid-cols-2 xl:grid-cols-4 [&>*]:border-border sm:[&>*:nth-child(odd)]:border-r xl:[&>*]:border-r xl:[&>*:last-child]:border-r-0 [&>*]:border-b sm:[&>*:nth-child(n+3)]:border-b-0 xl:[&>*]:border-b-0">
      {[
        { label: "Monthly cloud spend", value: fmtUSD(kpis.monthlySpend), note: `+${kpis.spendTrend}% vs. last month`, tone: "text-warning" },
        { label: "Active resources", value: total.toLocaleString("en-US"), note: "Across AWS & Azure", tone: "text-muted-foreground" },
        { label: "FinOps score", value: `${kpis.finopsScore}`, note: "Top 12% of peers", tone: "text-success" },
        { label: "Potential savings", value: fmtUSD(kpis.potentialSavings), note: "$51,270 remaining in Q4", tone: "text-muted-foreground" },
      ].map((k) => (
        <article key={k.label} className="group px-4 py-7 text-center transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-secondary/50">
          <Label>{k.label}</Label>
          <p className="metric-numbers mt-3 text-4xl font-normal transition-transform duration-200 group-hover:scale-[1.025] 2xl:text-5xl">{k.value}</p>
          <p className={`mt-3 font-mono text-[11px] ${k.tone}`}>{k.note}</p>
        </article>
      ))}
    </section>
  );
}

export function CostTrend({ data }: { data: CostPoint[] }) {
  return (
    <article className="organic-card h-full min-h-[410px] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Label>Cloud spend</Label><h2 className="mt-2 text-xl font-medium">Cost velocity</h2><p className="mt-1 text-sm text-muted-foreground">Actual spend by provider</p></div>
        <div className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-aws" />AWS</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-azure" />Azure</span></div>
      </div>
      <div className="mt-8 h-[290px]">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: -16, right: 4 }}>
            <defs><linearGradient id="awsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--aws)" stopOpacity={0.18} /><stop offset="1" stopColor="var(--aws)" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtUSD(Number(v))} />
            <Area type="monotone" dataKey="aws" name="AWS" stroke="var(--aws)" strokeWidth={2} fill="url(#awsFill)" animationDuration={900} animationEasing="ease-out" />
            <Area type="monotone" dataKey="azure" name="Azure" stroke="var(--azure)" strokeWidth={2} fill="transparent" animationDuration={1050} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function BudgetForecast() {
  const [budget, setBudget] = useState(300);
  const forecast = 284.6;
  const percentage = Math.min(100, Math.round((forecast / budget) * 100));
  return (
    <article className="organic-card flex h-full min-h-[410px] flex-col p-6 md:p-8">
      <div className="flex items-start justify-between"><div><Label>Budget & forecast</Label><h2 className="mt-2 text-xl font-medium">Q4 trajectory</h2></div><span className={`rounded-full px-2 py-1 text-xs ${percentage > 95 ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>{percentage}% projected</span></div>
      <div className="mt-8 flex justify-center"><Ring value={percentage} tone={percentage > 95 ? "warning" : "success"} size={154} /></div>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5"><div><Label>Forecast</Label><p className="metric-numbers mt-2 text-xl font-medium">${forecast}k</p></div><div><Label>Budget</Label><p className="metric-numbers mt-2 text-xl font-medium">${budget}k</p></div></div>
      <div className="mt-auto pt-6"><div className="mb-3 flex justify-between text-xs text-muted-foreground"><span>Adjust scenario</span><span className="metric-numbers">${budget}k</span></div><Slider value={[budget]} min={260} max={360} step={5} onValueChange={(value) => setBudget(value[0] ?? 300)} aria-label="Quarterly budget" /></div>
    </article>
  );
}

const initialLogs = [
  { time: "12:11:04", event: "checkout-api v3.18 deployed", state: "Healthy" },
  { time: "12:08:31", event: "worker-pool scaled 18 → 24 pods", state: "Scaled" },
  { time: "12:02:17", event: "payments-db readiness probe recovered", state: "Recovered" },
];

export function InfrastructureStatus() {
  const [cpu, setCpu] = useState(64);
  const [memory, setMemory] = useState(71);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => { setCpu((v) => Math.max(42, Math.min(78, v + (Math.random() > .5 ? 1 : -1)))); setMemory((v) => Math.max(60, Math.min(82, v + (Math.random() > .5 ? 1 : -1)))); setTick((v) => v + 1); }, 2400);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <article id="infrastructure" className="organic-card p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><Label>Live infrastructure</Label><h2 className="mt-2 text-xl font-medium">Kubernetes health</h2></div><span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs text-success"><span className="pulse-dot size-1.5 rounded-full bg-success" />Live · {tick + 1}s</span></div>
      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <div className="interactive-surface flex items-center gap-4 rounded-2xl border border-transparent bg-secondary p-4"><Ring value={cpu} size={78} /><div><Cpu className="size-4 text-muted-foreground" /><p className="mt-2 text-sm font-medium">CPU utilization</p><p className="text-xs text-muted-foreground">Across 42 nodes</p></div></div>
        <div className="interactive-surface flex items-center gap-4 rounded-2xl border border-transparent bg-secondary p-4"><Ring value={memory} tone="warning" size={78} /><div><MemoryStick className="size-4 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Memory</p><p className="text-xs text-muted-foreground">9.8 TB allocated</p></div></div>
        <div className="interactive-surface rounded-2xl border border-transparent bg-secondary p-4 md:col-span-2"><div className="flex items-center justify-between"><span className="text-xs font-medium">Cluster status</span><span className="text-xs text-success">286 / 288 pods</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><p className="metric-numbers text-lg font-medium">3</p><p className="text-[10px] text-muted-foreground">Clusters</p></div><div><p className="metric-numbers text-lg font-medium">42</p><p className="text-[10px] text-muted-foreground">Nodes</p></div><div><p className="metric-numbers text-lg font-medium text-warning">2</p><p className="text-[10px] text-muted-foreground">Pending</p></div></div></div>
      </div>
      <div className="mt-6 border-t border-border pt-5"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium">Deployment activity</span><Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => toast("Deployment log opened")}>View all <ChevronRight /></Button></div><div className="space-y-3">{initialLogs.map((log) => <div key={log.time} className="grid grid-cols-[66px_1fr_auto] items-center gap-2 text-xs"><span className="metric-numbers font-mono text-muted-foreground">{log.time}</span><span className="truncate">{log.event}</span><span className="text-success">{log.state}</span></div>)}</div></div>
    </article>
  );
}

const savingItems = [
  { id: 1, title: "Right-size 4 RDS instances", detail: "Low CPU over 30 days", amount: 1240 },
  { id: 2, title: "Release unattached volumes", detail: "1.2 TB idle storage", amount: 580 },
  { id: 3, title: "Schedule dev clusters", detail: "Pause outside office hours", amount: 3420 },
];

export function SavingsWorkflow() {
  const [done, setDone] = useState<number[]>([]);
  const pending = savingItems.filter((item) => !done.includes(item.id));
  return (
    <article id="savings" className="organic-card h-full p-6 md:p-8">
      <div className="flex items-start justify-between"><div><Label>Savings workflow</Label><h2 className="mt-2 text-xl font-medium">{fmtUSD(pending.reduce((sum, item) => sum + item.amount, 0))} ready</h2></div><Sparkles className="size-5 text-primary" /></div>
       <div className="mt-6 space-y-3">{savingItems.map((item) => { const complete = done.includes(item.id); return <div key={item.id} className={`interactive-surface rounded-2xl border p-4 ${complete ? "border-success/20 bg-success-soft" : "border-border bg-secondary"}`}><div className="flex gap-3"><div className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full transition-transform duration-300 ${complete ? "scale-110 bg-success text-primary-foreground" : "bg-card text-muted-foreground"}`}>{complete ? <Check className="size-3.5 animate-in zoom-in" /> : <CircleAlert className="size-3.5" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className={`text-sm font-medium transition-colors ${complete ? "text-muted-foreground line-through" : ""}`}>{item.title}</p><span className="metric-numbers text-sm font-medium text-primary">{fmtUSD(item.amount)}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>{!complete && <Button variant="ghost" size="sm" className="mt-2 h-7 px-0 text-xs text-foreground hover:bg-transparent" onClick={() => { setDone((current) => [...current, item.id]); toast.success(`${item.title} marked complete`); }}>Mark complete <ArrowDownRight /></Button>}</div></div></div>; })}</div>
      {done.length > 0 && <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => setDone([])}>Reset workflow</Button>}
    </article>
  );
}

export function Allocation() {
  const total = allocation.reduce((sum, item) => sum + item.value, 0);
  return (
    <article className="organic-card h-full p-6 md:p-8"><Label>Cost allocation</Label><h2 className="mt-2 text-xl font-medium">By service</h2><div className="relative mt-4 h-48"><ResponsiveContainer><PieChart><Pie data={allocation} dataKey="value" innerRadius={58} outerRadius={78} paddingAngle={4} stroke="none">{allocation.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtUSD(Number(v))} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="metric-numbers text-base font-medium">{fmtUSD(total)}</p><p className="text-[10px] text-muted-foreground">this month</p></div></div></div><ul className="space-y-3">{allocation.map((item) => <li key={item.name} className="flex items-center gap-3 text-xs"><i className="size-2 rounded-full" style={{ background: item.color }} /><span className="text-muted-foreground">{item.name}</span><span className="metric-numbers ml-auto">{Math.round(item.value / total * 100)}%</span></li>)}</ul></article>
  );
}

const statusStyle: Record<ResourceStatus, string> = { Running: "bg-success-soft text-success", Idle: "bg-muted text-muted-foreground", Warning: "bg-warning-soft text-warning" };

export function ResourceTable() {
  const resources = useDashboardData().resources;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | ResourceStatus>("All");
  const rows = useMemo(() => resources.filter((item) => (status === "All" || item.status === status) && `${item.name} ${item.type} ${item.region}`.toLowerCase().includes(query.toLowerCase())), [query, status, resources]);
  return (
    <article id="resources" className="organic-card h-full overflow-hidden">
      <div className="p-6 md:p-8"><div className="flex flex-wrap items-end gap-3"><div><Label>Resource inventory</Label><h2 className="mt-2 text-xl font-medium">Cloud estate</h2></div><label className="ml-auto flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-secondary px-3 py-2 sm:max-w-56"><Search className="size-4 text-muted-foreground" /><input className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" /></label><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-xl border border-input bg-secondary px-3 py-2 text-sm outline-none"><option>All</option><option>Running</option><option>Idle</option><option>Warning</option></select></div></div>
      <div className="max-h-[372px] overflow-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="sticky top-0 bg-card font-mono text-[10px] text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Resource</th><th className="px-4 py-3 font-medium">Provider</th><th className="px-4 py-3 font-medium">Cost / mo</th><th className="px-6 py-3 font-medium">Status</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="group border-t border-border transition-[background-color,transform] duration-150 hover:bg-secondary"><td className="px-6 py-4"><p className="font-medium transition-transform duration-150 group-hover:translate-x-0.5">{item.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.type} · {item.region}</p></td><td className="px-4 py-4 text-muted-foreground">{item.provider}</td><td className="metric-numbers px-4 py-4">{fmtUSD(item.monthlyCost)}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 ${statusStyle[item.status]}`}><i className="size-1.5 rounded-full bg-current" />{item.status}</span></td></tr>)}{rows.length === 0 && <tr><td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">No matching resources</td></tr>}</tbody></table></div>
    </article>
  );
}