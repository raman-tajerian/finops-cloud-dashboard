import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Area, ComposedChart, CartesianGrid, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { fmtUSD } from "@/lib/finops-data";
import { useDashboardData } from "@/lib/queries";
import { DataTableView, TableToggle } from "./States";
import { CountUp } from "./Insights";
import { Spark } from "./Platform";
import type { KpiValue } from "@/types/finops";

const Label = ({ children }: { children: ReactNode }) => <p className="font-mono text-[10px] text-muted-foreground">{children}</p>;
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
type To = "/cost-explorer" | "/recommendations" | "/resources" | "/budgets";

/** Card header link that drills down; global filters are retained by the root search middleware. */
export function DrillLink({ to, children = "Open" }: { to: To; children?: ReactNode }) {
  return <Link to={to} className="group inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">{children}<ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></Link>;
}

const pctDelta = (k: KpiValue) => (k.previous ? ((k.value - k.previous) / k.previous) * 100 : 0);

export function OverviewKpis() {
  const o = useDashboardData().overview;
  const money = (n: number) => fmtUSD(n);
  const items: { label: string; k: KpiValue; f: (n: number) => string; to: To; goodWhenUp?: boolean; color: string }[] = [
    { label: "Total spend", k: o.totalSpend, f: money, to: "/cost-explorer", color: "var(--chart-1)" },
    { label: "Forecast end of month", k: o.forecastEom, f: money, to: "/budgets", color: "var(--chart-1)" },
    { label: "Daily burn rate", k: o.dailyBurn, f: (n) => `${fmtUSD(n)}/d`, to: "/cost-explorer", color: "var(--chart-2)" },
    { label: "Savings opportunity", k: o.savings, f: (n) => `${fmtUSD(n)}/mo`, to: "/recommendations", goodWhenUp: true, color: "var(--success)" },
    { label: `Idle waste · ${o.idleCount} res.`, k: o.idleWaste, f: (n) => `${fmtUSD(n)}/mo`, to: "/resources", color: "var(--chart-3)" },
    { label: "Active anomalies", k: o.anomalies, f: (n) => `${Math.round(n)}`, to: "/budgets", color: "var(--destructive)" },
    { label: "Cost per active user", k: o.costPerUser, f: (n) => `$${n.toFixed(4)}`, to: "/cost-explorer", color: "var(--chart-4)" },
    { label: "Cost per API request", k: o.costPerRequest, f: (n) => `$${n.toFixed(6)}`, to: "/cost-explorer", color: "var(--chart-4)" },
  ];
  return (
    <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => {
        const d = pctDelta(it.k), up = d > 0, good = it.goodWhenUp ? up : !up;
        return (
          <Link key={it.label} to={it.to} className="organic-card subtle-lift group block p-5">
            <div className="flex items-center justify-between gap-2"><Label>{it.label}</Label><ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="metric-numbers whitespace-nowrap text-2xl" aria-live="polite"><CountUp value={it.k.value} format={it.f} /></p>
              <Spark data={it.k.spark} color={it.color} className="h-8 w-20" />
            </div>
            <p className={`mt-2 inline-flex items-center gap-1 text-[11px] ${Math.abs(d) < 0.05 ? "text-muted-foreground" : good ? "text-success" : "text-warning"}`}>
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{up ? "+" : ""}{d.toFixed(1)}% <span className="text-muted-foreground">vs previous · {it.f(it.k.previous)}</span>
            </p>
          </Link>
        );
      })}
    </section>
  );
}

export function CostTrendCard() {
  const { trend, providers, kpis } = useDashboardData();
  const [asTable, setAsTable] = useState(false);
  const navigate = useNavigate();
  const data = trend.map((t) => (t.total === 0 && t.forecast !== null ? { ...t, AWS: null, Azure: null, GCP: null } : t));
  const markers = trend.filter((t) => t.anomaly);
  const colors = { AWS: "var(--aws)", Azure: "var(--azure)", GCP: "var(--gcp)" } as const;
  return (
    <article className="organic-card h-full p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Label>Cost trend by provider</Label><p className="mt-1 text-sm text-muted-foreground">Daily spend, dashed forecast with 95% band · {markers.length} anomaly marker{markers.length === 1 ? "" : "s"}</p></div>
        <div className="flex items-center gap-1"><TableToggle on={asTable} onChange={setAsTable} /><DrillLink to="/cost-explorer">Explore</DrillLink></div>
      </div>
      <div className="mt-4 h-72">
        {asTable ? <DataTableView caption="Daily cost by provider with forecast" columns={["Day", ...providers, "Forecast", "Band", "Anomaly"]} rows={trend.map((t) => [t.day, ...providers.map((p) => (t.total ? fmtUSD(t[p]) : "—")), t.forecast === null ? "—" : fmtUSD(t.forecast), t.band ? `${fmtUSD(t.band[0])} – ${fmtUSD(t.band[1])}` : "—", t.anomaly ?? ""])} /> :
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ left: -6, right: 8, top: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={tip} formatter={(v, n) => [Array.isArray(v) ? `${fmtUSD(Number(v[0]))} – ${fmtUSD(Number(v[1]))}` : fmtUSD(Number(v)), String(n)]} />
            {providers.map((p) => <Area key={p} dataKey={p} stackId="p" stroke={colors[p]} fill={colors[p]} fillOpacity={0.1} strokeWidth={1.5} animationDuration={700} />)}
            <Area dataKey="band" name="95% band" stroke="none" fill="var(--muted-foreground)" fillOpacity={0.12} />
            <Line dataKey="forecast" name="Forecast" stroke="var(--muted-foreground)" strokeDasharray="5 4" dot={false} strokeWidth={1.5} connectNulls />
            {markers.map((m) => (
              <ReferenceDot key={m.day} x={m.day} y={m.total} r={6} fill="var(--destructive)" stroke="var(--card)" strokeWidth={2} className="cursor-pointer"
                onClick={() => navigate({ to: "/cost-explorer", search: (prev: Record<string, unknown>) => ({ ...prev, group: "service" }) } as never)}
                label={{ value: "!", fill: "var(--card)", fontSize: 9, position: "center" }} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>}
      </div>
      {kpis.anomalies[0] && <p className="mt-3 text-xs text-muted-foreground">Click a red marker to investigate · top: <span className="text-foreground">{kpis.anomalies[0].title}</span> +{kpis.anomalies[0].change}%</p>}
    </article>
  );
}

export function TopMovers() {
  const { up, down } = useDashboardData().movers;
  const List = ({ title, items, inc }: { title: string; items: typeof up; inc: boolean }) => (
    <div><p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <ul className="space-y-1">{items.length === 0 && <li className="text-xs text-muted-foreground">None in this period</li>}
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary">
            {inc ? <ArrowUpRight className="size-3.5 text-warning" /> : <ArrowDownRight className="size-3.5 text-success" />}
            <span className="min-w-0 flex-1 truncate">{m.name}<span className="ml-1 text-[11px] text-muted-foreground">{m.provider} {m.service}</span></span>
            <span className={`metric-numbers text-xs ${inc ? "text-warning" : "text-success"}`}>{inc ? "+" : "−"}{fmtUSD(Math.abs(m.delta))}</span>
          </li>
        ))}</ul>
    </div>
  );
  return (
    <article className="organic-card h-full p-6">
      <div className="flex items-start justify-between gap-3"><div><Label>Top movers</Label><p className="mt-1 text-sm text-muted-foreground">Largest changes vs previous period</p></div><DrillLink to="/resources">Resources</DrillLink></div>
      <div className="mt-4 grid gap-5"><List title="Increases" items={up} inc /><List title="Decreases" items={down} inc={false} /></div>
    </article>
  );
}
