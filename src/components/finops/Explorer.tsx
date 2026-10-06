import { useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Bookmark, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/finops-data";
import { useExplore } from "@/lib/queries";
import { useGlobalFilters, type Filters } from "@/lib/filters";
import { CardSkeleton, DataTableView, ErrorState, TableToggle } from "./States";
import { Spark } from "./Platform";
import type { ExploreDto, ExploreRow, GroupBy } from "@/types/finops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ChartType = "area" | "bar" | "line";
export interface ExplorerState { group: GroupBy; chart: ChartType; compare: boolean }
export const groupLabels: Record<GroupBy, string> = { service: "Service", provider: "Provider", region: "Region", team: "Team", environment: "Environment", tag: "Tag (app)" };
const palette: string[] = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--aws)", "var(--azure)", "var(--gcp)", "var(--muted-foreground)"];
const col = (i: number) => palette[i % palette.length] ?? "var(--chart-1)";
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const Label = ({ children }: { children: ReactNode }) => <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{children}</p>;
const Seg = <T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) => (
  <div role="group" aria-label={label} className="flex flex-wrap rounded-xl bg-secondary p-1">
    {options.map(([v, l]) => <button key={v} aria-pressed={value === v} onClick={() => onChange(v)} className={`min-h-8 rounded-lg px-3 text-xs transition-colors active:scale-95 ${value === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>)}
  </div>
);

export interface SavedView { name: string; filters: Filters; state: ExplorerState }

function SavedViews({ state, views, onSave, onApply }: { state: ExplorerState; views: SavedView[]; onSave: (v: SavedView) => void; onApply: (v: SavedView) => void }) {
  const { filters } = useGlobalFilters();
  const [name, setName] = useState("");
  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild><Button variant="secondary" className="rounded-xl"><Bookmark />Save view</Button></PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-3">
          <Label>View name</Label>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; onSave({ name: name.trim(), filters, state }); toast.success(`Saved view "${name.trim()}"`); setName(""); }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Prod by team" maxLength={40} aria-label="View name" />
            <Button type="submit" disabled={!name.trim()}>Save</Button>
          </form>
          <p className="text-[11px] text-muted-foreground">Saved in this page URL so it survives reload and can be shared.</p>
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="secondary" className="rounded-xl">Views{views.length > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px]">{views.length}</span>}</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel><DropdownMenuSeparator />
          {views.length === 0 && <DropdownMenuItem disabled>No saved views yet</DropdownMenuItem>}
          {views.map((v) => <DropdownMenuItem key={v.name} onClick={() => onApply(v)}>{v.name}<span className="ml-auto pl-3 text-[11px] text-muted-foreground">{groupLabels[v.state.group]}</span></DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ---------- Export ---------- */
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
export function toCsv(rows: ExploreRow[], group: GroupBy) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [[groupLabels[group], "current_usd", "previous_usd", "change_pct", "share_pct"].join(","), ...rows.map((r) => [esc(r.name), r.current.toFixed(2), r.previous.toFixed(2), r.changePct.toFixed(2), r.share.toFixed(2)].join(","))].join("\n");
}

/* ---------- Page body ---------- */
type SortKey = "name" | "current" | "previous" | "changePct" | "share";
export function CostExplorer({ state, views, setViews, setState }: { state: ExplorerState; views: SavedView[]; setViews: (v: SavedView[]) => void; setState: (s: Partial<ExplorerState>, f?: Filters) => void }) {
  const q = useExplore(state.group);
  const { filters } = useGlobalFilters();
  if (q.isPending) return <CardSkeleton h="h-96" />;
  if (q.isError) return <ErrorState message="We couldn't load cost data. Try again." onRetry={() => q.refetch()} />;
  const d = q.data;
  const exportAs = (kind: "csv" | "json") => {
    const stamp = `nimbusops-${state.group}-${filters.range}`;
    if (kind === "csv") download(`${stamp}.csv`, toCsv(d.rows, state.group), "text/csv");
    else download(`${stamp}.json`, JSON.stringify({ filters, groupBy: state.group, total: d.total, previousTotal: d.previousTotal, rows: d.rows.map(({ spark: _s, ...r }) => r) }, null, 2), "application/json");
    toast.success(`Exported ${kind.toUpperCase()}`);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Seg label="Group by" value={state.group} onChange={(group) => setState({ group })} options={(Object.keys(groupLabels) as GroupBy[]).map((g) => [g, groupLabels[g]])} />
        <Seg label="Chart type" value={state.chart} onChange={(chart) => setState({ chart })} options={[["area", "Area"], ["bar", "Stacked bar"], ["line", "Line"]]} />
        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-secondary px-3 text-xs">
          <input type="checkbox" checked={state.compare} onChange={(e) => setState({ compare: e.target.checked })} className="accent-[var(--primary)]" />Compare to previous period
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <SavedViews state={state} views={views} onSave={(v) => setViews([...views.filter((x) => x.name !== v.name), v].slice(-8))} onApply={(v) => { setState(v.state, v.filters); toast(`Opened "${v.name}"`); }} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="secondary" className="rounded-xl"><Download />Export</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportAs("csv")}><FileSpreadsheet />CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("json")}><FileJson />JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ExplorerChart d={d} state={state} />
      <ExplorerTable d={d} group={state.group} />
    </div>
  );
}

function ExplorerChart({ d, state }: { d: ExploreDto; state: ExplorerState }) {
  const [asTable, setAsTable] = useState(false);
  const change = d.previousTotal ? ((d.total - d.previousTotal) / d.previousTotal) * 100 : 0;
  const axis = { tick: { fontSize: 10, fill: "var(--muted-foreground)" }, tickLine: false, axisLine: false } as const;
  const children = [
    <CartesianGrid key="g" stroke="var(--border)" strokeDasharray="2 4" vertical={false} />,
    <XAxis key="x" dataKey="day" {...axis} minTickGap={24} />,
    <YAxis key="y" {...axis} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`} />,
    <Tooltip key="t" contentStyle={tip} formatter={(v, n) => [fmtUSD(Number(v)), String(n)]} />,
  ];
  const overlay = state.compare ? <Line key="prev" dataKey="previous" name="Previous period (total)" stroke="var(--foreground)" strokeOpacity={0.55} strokeDasharray="5 4" dot={false} strokeWidth={1.5} /> : null;
  return (
    <article className="organic-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Spend by {groupLabels[state.group].toLowerCase()}</p>
          <p className="metric-numbers mt-1 text-3xl">{fmtUSD(d.total)}</p>
          <p className={`text-xs ${change > 0 ? "text-warning" : "text-success"}`}>{change > 0 ? "+" : ""}{change.toFixed(1)}% <span className="text-muted-foreground">vs {fmtUSD(d.previousTotal)} previous period</span></p></div>
        <TableToggle on={asTable} onChange={setAsTable} />
      </div>
      <div className="mt-6 h-[420px]" aria-live="polite">
        {asTable ? <DataTableView caption={`Daily spend by ${state.group}`} columns={["Day", ...d.keys, "Total", ...(state.compare ? ["Previous"] : [])]} rows={d.series.map((s) => [String(s["day"]), ...d.keys.map((k) => fmtUSD(Number(s[k]))), fmtUSD(Number(s["total"])), ...(state.compare ? [fmtUSD(Number(s["previous"]))] : [])])} /> :
        <ResponsiveContainer key={`${state.chart}-${state.group}`}>
          {state.chart === "bar" ? (
            <BarChart data={d.series}>{children}{d.keys.map((k, i) => <Bar key={k} dataKey={k} stackId="s" fill={col(i)} fillOpacity={0.85} />)}{overlay}</BarChart>
          ) : state.chart === "line" ? (
            <LineChart data={d.series}>{children}{d.keys.map((k, i) => <Line key={k} dataKey={k} stroke={col(i)} dot={false} strokeWidth={1.6} />)}{overlay}</LineChart>
          ) : (
            <AreaChart data={d.series}>{children}{d.keys.map((k, i) => <Area key={k} dataKey={k} stackId="s" stroke={col(i)} fill={col(i)} fillOpacity={0.1} />)}{overlay}</AreaChart>
          )}
        </ResponsiveContainer>}
      </div>
    </article>
  );
}

function ExplorerTable({ d, group }: { d: ExploreDto; group: GroupBy }) {
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "current", dir: -1 });
  const rows = useMemo(() => [...d.rows].sort((a, b) => (sort.k === "name" ? a.name.localeCompare(b.name) : a[sort.k] - b[sort.k]) * sort.dir), [d.rows, sort]);
  const th = (k: SortKey, l: string, right = true) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`px-4 py-3 font-medium ${right ? "text-right" : ""}`}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))}>{l}{sort.k === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</button>
    </th>
  );
  const totalChange = d.previousTotal ? ((d.total - d.previousTotal) / d.previousTotal) * 100 : 0;
  return (
    <article className="organic-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Cost by {group}</caption>
          <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><tr>{th("name", groupLabels[group], false)}{th("current", "Current")}{th("previous", "Previous")}{th("changePct", "Change")}{th("share", "Share")}<th scope="col" className="px-4 py-3 font-medium">Trend</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="border-t border-border hover:bg-secondary">
                <td className="sticky left-0 bg-card px-4 py-3 font-medium"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: col(d.keys.indexOf(r.name)) }} />{r.name}</td>
                <td className="metric-numbers px-4 py-3 text-right">{fmtUSD(r.current)}</td>
                <td className="metric-numbers px-4 py-3 text-right text-muted-foreground">{fmtUSD(r.previous)}</td>
                <td className={`metric-numbers px-4 py-3 text-right ${r.changePct > 0 ? "text-warning" : "text-success"}`}>{r.changePct > 0 ? "+" : ""}{r.changePct.toFixed(1)}%</td>
                <td className="metric-numbers px-4 py-3 text-right">{r.share.toFixed(1)}%</td>
                <td className="px-4 py-2"><Spark data={r.spark} color={col(d.keys.indexOf(r.name))} className="h-7 w-24" /><span className="sr-only">row {i + 1}</span></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-input font-medium">
            <td className="sticky left-0 bg-card px-4 py-3">Total</td>
            <td className="metric-numbers px-4 py-3 text-right">{fmtUSD(d.total)}</td>
            <td className="metric-numbers px-4 py-3 text-right text-muted-foreground">{fmtUSD(d.previousTotal)}</td>
            <td className={`metric-numbers px-4 py-3 text-right ${totalChange > 0 ? "text-warning" : "text-success"}`}>{totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}%</td>
            <td className="metric-numbers px-4 py-3 text-right">100.0%</td><td />
          </tr></tfoot>
        </table>
      </div>
    </article>
  );
}
