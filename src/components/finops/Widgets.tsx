import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  TrendingUp, Boxes, Sparkles, AlertTriangle, ShieldAlert, ChevronDown, Search, Scale, Square, ScrollText,
} from "lucide-react";
import {
  alerts, allocation, fmtUSD, kpis, resources, type CostPoint, type ResourceStatus,
} from "@/lib/finops-data";
import { toast } from "sonner";

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</p>
);

export function AlertBanner() {
  const [open, setOpen] = useState(true);
  return (
    <section className="glass overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
        <ShieldAlert className="size-4 text-destructive" />
        <span className="text-sm font-medium">Security & compliance</span>
        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">{alerts.length} findings</span>
        <ChevronDown className={`ml-auto size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-px border-t border-border bg-border md:grid-cols-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex gap-3 bg-background/80 px-5 py-4">
              <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${a.severity === "critical" ? "text-destructive" : "text-warning"}`} />
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Ring({ value }: { value: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 84 84" className="size-24 -rotate-90">
      <defs>
        <linearGradient id="ring" x1="0" x2="1"><stop offset="0" stopColor="var(--teal)" /><stop offset="1" stopColor="var(--primary)" /></linearGradient>
      </defs>
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="url(#ring)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
        style={{ filter: "drop-shadow(0 0 6px var(--teal))", transition: "stroke-dashoffset 1s" }} />
    </svg>
  );
}

export function KpiCards() {
  const total = kpis.resources.vms + kpis.resources.containers + kpis.resources.databases;
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="glass glass-hover p-5">
        <Label>Monthly cloud spend</Label>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-tight">{fmtUSD(kpis.monthlySpend)}</p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
          <TrendingUp className="size-3" /> +{kpis.spendTrend}% vs last month
        </span>
      </div>
      <div className="glass glass-hover p-5">
        <div className="flex items-center justify-between"><Label>Active resources</Label><Boxes className="size-4 text-teal" /></div>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-tight">{total.toLocaleString()}</p>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span><b className="text-foreground">{kpis.resources.vms}</b> VMs</span>
          <span><b className="text-foreground">{kpis.resources.containers.toLocaleString()}</b> Containers</span>
          <span><b className="text-foreground">{kpis.resources.databases}</b> DBs</span>
        </div>
      </div>
      <div className="glass glass-hover flex items-center gap-4 p-5">
        <div className="relative">
          <Ring value={kpis.finopsScore} />
          <span className="absolute inset-0 grid place-items-center font-mono text-xl font-semibold">{kpis.finopsScore}</span>
        </div>
        <div>
          <Label>FinOps score</Label>
          <p className="mt-2 text-sm font-medium text-teal">{kpis.finopsScore}/100 Optimized</p>
          <p className="mt-1 text-xs text-muted-foreground">Top 12% of peers</p>
        </div>
      </div>
      <div className="glass glass-hover p-5">
        <div className="flex items-center justify-between"><Label>Potential savings</Label><Sparkles className="size-4 text-teal" /></div>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-teal">{fmtUSD(kpis.potentialSavings)}<span className="text-sm text-muted-foreground">/mo</span></p>
        <button onClick={() => toast.success("Auto-optimize queued for 14 recommendations")}
          className="btn-teal mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold">Auto-Optimize</button>
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)",
};

export function CostTrend({ data }: { data: CostPoint[] }) {
  return (
    <div className="glass p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><Label>Cost trends</Label><p className="mt-1 text-sm text-muted-foreground">AWS vs Azure spend</p></div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-aws" />AWS</span>
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-azure" />Azure</span>
        </div>
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: -10, right: 4 }}>
            <defs>
              <linearGradient id="gAws" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--aws)" stopOpacity={0.35} /><stop offset="1" stopColor="var(--aws)" stopOpacity={0} /></linearGradient>
              <linearGradient id="gAz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--azure)" stopOpacity={0.35} /><stop offset="1" stopColor="var(--azure)" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtUSD(Number(v))} />
            <Area type="monotone" dataKey="aws" name="AWS" stroke="var(--aws)" strokeWidth={2} fill="url(#gAws)" />
            <Area type="monotone" dataKey="azure" name="Azure" stroke="var(--azure)" strokeWidth={2} fill="url(#gAz)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Allocation() {
  const total = allocation.reduce((s, a) => s + a.value, 0);
  return (
    <div className="glass p-5">
      <Label>Allocation by service</Label>
      <div className="relative mt-2 h-48">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={allocation} dataKey="value" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="none">
              {allocation.map((a) => <Cell key={a.name} fill={a.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtUSD(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="font-mono text-lg font-semibold">{fmtUSD(total)}</p><p className="text-xs text-muted-foreground">this month</p></div>
        </div>
      </div>
      <ul className="mt-3 space-y-2.5">
        {allocation.map((a) => (
          <li key={a.name} className="flex items-center gap-2 text-sm">
            <i className="size-2 rounded-full" style={{ background: a.color }} />
            <span className="text-muted-foreground">{a.name}</span>
            <span className="ml-auto font-mono">{Math.round((a.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const statusStyle: Record<ResourceStatus, string> = {
  Running: "bg-success/12 text-success",
  Idle: "bg-muted text-muted-foreground",
  Warning: "bg-warning/12 text-warning",
};

export function ResourceTable() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | ResourceStatus>("All");
  const rows = useMemo(
    () => resources.filter((r) =>
      (status === "All" || r.status === status) &&
      `${r.name} ${r.type} ${r.region}`.toLowerCase().includes(q.toLowerCase())),
    [q, status],
  );
  const act = (a: string, n: string) => toast(`${a} → ${n}`);
  return (
    <section className="glass overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <div><Label>Resources</Label><p className="mt-1 text-sm text-muted-foreground">{rows.length} of {resources.length} shown</p></div>
        <div className="ml-auto flex w-full gap-2 sm:w-auto">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-secondary/50 px-3 py-1.5 sm:w-64">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm outline-none">
            {["All", "Running", "Idle", "Warning"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-y border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              {["Resource", "Provider", "Type", "Region", "Cost/mo", "Status", ""].map((h) => (
                <th key={h} className={`px-5 py-3 font-medium ${h === "Cost/mo" ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="group border-b border-border/60 transition-colors hover:bg-accent/40">
                <td className="px-5 py-3.5 font-mono text-[13px]">{r.name}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${r.provider === "AWS" ? "bg-aws/12 text-aws" : "bg-azure/12 text-azure"}`}>
                    {r.provider}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{r.type}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{r.region}</td>
                <td className="px-5 py-3.5 text-right font-mono">{fmtUSD(r.monthlyCost)}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${statusStyle[r.status]}`}>
                    <i className="size-1.5 rounded-full bg-current" />{r.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    {[{ i: Scale, l: "Scale" }, { i: Square, l: "Stop" }, { i: ScrollText, l: "View Logs" }].map(({ i: I, l }) => (
                      <button key={l} title={l} onClick={() => act(l, r.name)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><I className="size-4" /></button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No resources match.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
