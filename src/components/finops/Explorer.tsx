import { useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Bookmark, Download, FileJson, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, fmtMoneyCompact } from "@/lib/finops-data";
import { useExplore } from "@/lib/queries";
import { useGlobalFilters, type Filters } from "@/lib/filters";
import { CardSkeleton, DataTableView, ErrorState, PageHero, ShowAllButton, TableToggle, useLimited } from "./States";
import { Spark } from "./Platform";
import type { ExploreDto, ExploreRow, GroupBy } from "@/types/finops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MetricInfo } from "./Help";

export type ChartType = "area" | "bar" | "line";
export interface ExplorerState { group: GroupBy; chart: ChartType; compare: boolean }
export const groupLabels: Record<GroupBy, string> = { service: "Service", provider: "Provider", region: "Region", team: "Team", environment: "Environment", tag: "Tag (app)" };
const palette: string[] = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--aws)", "var(--azure)", "var(--gcp)", "var(--muted-foreground)"];
const col = (i: number) => palette[i % palette.length] ?? "var(--chart-1)";
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const Label = ({ children }: { children: ReactNode }) => <p className="text-[15px] font-medium leading-snug text-foreground">{children}</p>;
const Seg = <T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) => (
  <div role="group" aria-label={label} className="flex flex-wrap rounded-xl bg-secondary p-1">
    {options.map(([v, l]) => <button key={v} aria-pressed={value === v} onClick={() => onChange(v)} className={`min-h-8 rounded-lg px-3 text-xs transition-colors active:scale-95 ${value === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>)}
  </div>
);

export interface SavedView { name: string; filters: Filters; state: ExplorerState }

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

function useExploreData(group: GroupBy) {
  const q = useExplore(group);
  if (q.isPending) return <CardSkeleton h="h-96" />;
  if (q.isError || !q.data) return <ErrorState message="We couldn't load cost data. Try again." onRetry={() => q.refetch()} />;
  return q.data;
}

/* ---------- Explore tab: controls + chart + table ---------- */
export function ExplorerMain({ state, setState }: { state: ExplorerState; setState: (s: Partial<ExplorerState>, f?: Filters) => void }) {
  const d = useExploreData(state.group);
  const { filters } = useGlobalFilters();
  if (!d || "type" in d) return d;
  const exportAs = (kind: "csv" | "json") => {
    const stamp = `fern-${state.group}-${filters.range}`;
    if (kind === "csv") download(`${stamp}.csv`, toCsv(d.rows, state.group), "text/csv");
    else download(`${stamp}.json`, JSON.stringify({ filters, groupBy: state.group, total: d.total, previousTotal: d.previousTotal, rows: d.rows.map(({ spark: _s, ...r }) => r) }, null, 2), "application/json");
    toast.success(`Exported ${kind.toUpperCase()}`);
  };
  const change = d.previousTotal ? ((d.total - d.previousTotal) / d.previousTotal) * 100 : 0;
  return (
    <div className="space-y-8">
      <PageHero label="Spend in selected period" value={fmtMoney(d.total)} change={<span className={change > 0 ? "text-warning" : "text-success"}>{change > 0 ? "+" : ""}{change.toFixed(1)}% vs previous period</span>} description={`Explore the total by ${groupLabels[state.group].toLowerCase()} and move between visual and tabular views.`} />
      <div className="flex flex-wrap items-center gap-3">
        <Seg label="Group by" value={state.group} onChange={(group) => setState({ group })} options={(Object.keys(groupLabels) as GroupBy[]).map((g) => [g, groupLabels[g]])} />
        <Seg label="Chart type" value={state.chart} onChange={(chart) => setState({ chart })} options={[["area", "Area"], ["bar", "Stacked bar"], ["line", "Line"]]} />
        <div className="ml-auto flex flex-wrap gap-2">
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

/* ---------- Compare tab: same chart with the previous-period overlay locked on ---------- */
export function ExplorerCompare({ state, setState }: { state: ExplorerState; setState: (s: Partial<ExplorerState>, f?: Filters) => void }) {
  const d = useExploreData(state.group);
  if (!d || "type" in d) return d;
  const compared = { ...state, compare: true };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Seg label="Group by" value={state.group} onChange={(group) => setState({ group })} options={(Object.keys(groupLabels) as GroupBy[]).map((g) => [g, groupLabels[g]])} />
        <p className="text-xs text-muted-foreground">Previous period overlay is always on in this view.</p>
      </div>
      <ExplorerChart d={d} state={compared} />
      <ExplorerTable d={d} group={state.group} />
    </div>
  );
}

/* ---------- Unit economics tab ---------- */
export function UnitEconCards() {
  const d = useExploreData("service");
  if (!d || "type" in d) return d;
  return (
    <section aria-label="Unit economics" className="grid gap-6 sm:grid-cols-2">
      {[{ label: "Cost per active user", value: d.unitEconomics.perUser, previous: d.unitEconomics.previousPerUser, decimals: 4 }, { label: "Cost per API request", value: d.unitEconomics.perRequest, previous: d.unitEconomics.previousPerRequest, decimals: 6 }].map((u) => (
        <article key={u.label} className="organic-card p-6"><div className="flex items-center"><Label>{u.label}</Label><MetricInfo label={u.label} /></div><p className="metric-numbers mt-2 text-[32px]">{fmtMoney(u.value, { decimals: u.decimals })}</p><p className="mt-2 text-xs text-muted-foreground">{u.previous > 0 ? `${((u.value / u.previous - 1) * 100).toFixed(1)}%` : "—"} vs prev</p></article>
      ))}
    </section>
  );
}

/* ---------- Saved views tab ---------- */
export function SavedViewsPanel({ state, views, setViews, setState }: { state: ExplorerState; views: SavedView[]; setViews: (v: SavedView[]) => void; setState: (s: Partial<ExplorerState>, f?: Filters) => void }) {
  const { filters } = useGlobalFilters();
  const [name, setName] = useState("");
  const save = () => {
    if (!name.trim()) return;
    setViews([...views.filter((x) => x.name !== name.trim()), { name: name.trim(), filters, state }].slice(-8));
    toast.success(`Saved view "${name.trim()}"`);
    setName("");
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="organic-card p-6" aria-label="Save current view">
        <Label>Save the current view</Label>
        <p className="mt-1 text-[13px] text-muted-foreground">Captures the grouping, chart type and the active global filters.</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Prod by team" maxLength={40} aria-label="View name" />
          <Button type="submit" disabled={!name.trim()}><Bookmark />Save</Button>
        </form>
        <p className="mt-3 text-[11px] text-muted-foreground">Saved in this page URL so it survives reload and can be shared.</p>
      </section>
      <section className="organic-card p-6" aria-label="Saved views">
        <Label>Saved views{views.length > 0 ? ` · ${views.length}` : ""}</Label>
        {views.length === 0 ? <div className="mt-4 space-y-3 rounded-xl bg-secondary p-6 text-center"><p className="text-sm text-muted-foreground">No views have been saved in this link yet.</p><Button variant="secondary" onClick={() => document.querySelector<HTMLInputElement>('[aria-label="View name"]')?.focus()}>Name current view</Button></div> : (
          <ul className="mt-4 divide-y divide-border">
            {views.map((v) => (
              <li key={v.name} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{groupLabels[v.state.group]} · {v.filters.range}{v.filters.env !== "All" ? ` · ${v.filters.env}` : ""}{v.filters.team !== "All" ? ` · ${v.filters.team}` : ""}</p></div>
                <Button size="sm" variant="secondary" className="h-10" onClick={() => { setState(v.state, v.filters); toast(`Opened "${v.name}"`); }}>Apply</Button>
                <Button size="icon" variant="ghost" className="size-10" aria-label={`Delete ${v.name}`} onClick={() => setViews(views.filter((x) => x.name !== v.name))}><Trash2 /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------- Chart and table ---------- */
function ExplorerChart({ d, state }: { d: ExploreDto; state: ExplorerState }) {
  const [asTable, setAsTable] = useState(false);
  const change = d.previousTotal ? ((d.total - d.previousTotal) / d.previousTotal) * 100 : 0;
  const axis = { tick: { fontSize: 10, fill: "var(--muted-foreground)" }, tickLine: false, axisLine: false } as const;
  const children = [
    <CartesianGrid key="g" stroke="var(--border)" strokeDasharray="2 4" vertical={false} />,
    <XAxis key="x" dataKey="day" {...axis} minTickGap={24} />,
    <YAxis key="y" {...axis} tickFormatter={(v) => fmtMoneyCompact(Number(v))} />,
    <Tooltip key="t" contentStyle={tip} formatter={(v, n) => [fmtMoney(Number(v)), String(n)]} />,
  ];
  const overlay = state.compare ? <Line key="prev" dataKey="previous" name="Previous period (total)" stroke="var(--foreground)" strokeOpacity={0.55} strokeDasharray="5 4" dot={false} strokeWidth={1.5} /> : null;
  return (
    <article className="organic-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-[10px] text-muted-foreground">Spend by {groupLabels[state.group].toLowerCase()}</p>
          <p className="metric-numbers mt-1 text-3xl">{fmtMoney(d.total)}</p>
          <p className={`text-xs ${change > 0 ? "text-warning" : "text-success"}`}>{change > 0 ? "+" : ""}{change.toFixed(1)}% <span className="text-muted-foreground">vs {fmtMoney(d.previousTotal)} previous period</span></p></div>
        <TableToggle on={asTable} onChange={setAsTable} />
      </div>
      <div className="mt-6 h-[420px]" aria-live="polite">
        {asTable ? <DataTableView caption={`Daily spend by ${state.group}`} columns={["Day", ...d.keys, "Total", ...(state.compare ? ["Previous"] : [])]} rows={d.series.map((s) => [String(s["day"]), ...d.keys.map((k) => fmtMoney(Number(s[k]))), fmtMoney(Number(s["total"])), ...(state.compare ? [fmtMoney(Number(s["previous"]))] : [])])} /> :
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

type SortKey = "name" | "current" | "previous" | "changePct" | "share";
function ExplorerTable({ d, group }: { d: ExploreDto; group: GroupBy }) {
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "current", dir: -1 });
  const rows = useMemo(() => [...d.rows].sort((a, b) => (sort.k === "name" ? a.name.localeCompare(b.name) : a[sort.k] - b[sort.k]) * sort.dir), [d.rows, sort]);
  const lim = useLimited(rows);
  const th = (k: SortKey, l: string, right = true) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`px-4 py-3 font-medium ${right ? "text-right" : ""}`}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))}>{l}{sort.k === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</button>
    </th>
  );
  const totalChange = d.previousTotal ? ((d.total - d.previousTotal) / d.previousTotal) * 100 : 0;
  return (
    <article className="organic-card relative inline-contain min-w-0 max-w-full overflow-hidden">
      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Cost by {group}</caption>
          <thead className="font-mono text-[10px] text-muted-foreground"><tr>{th("name", groupLabels[group], false)}{th("current", "Current")}{th("previous", "Previous")}{th("changePct", "Change")}{th("share", "Share")}<th scope="col" className="px-4 py-3 font-medium">Trend</th></tr></thead>
          <tbody>
            {lim.shown.map((r, i) => (
              <tr key={r.name} className="border-t border-border hover:bg-secondary">
                <td className="sticky left-0 bg-card px-4 py-3 font-medium"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: col(d.keys.indexOf(r.name)) }} />{r.name}</td>
                <td className="metric-numbers px-4 py-3 text-right">{fmtMoney(r.current)}</td>
                <td className="metric-numbers px-4 py-3 text-right text-muted-foreground">{fmtMoney(r.previous)}</td>
                <td className={`metric-numbers px-4 py-3 text-right ${r.changePct > 0 ? "text-warning" : "text-success"}`}>{r.changePct > 0 ? "+" : ""}{r.changePct.toFixed(1)}%</td>
                <td className="metric-numbers px-4 py-3 text-right">{r.share.toFixed(1)}%</td>
                <td className="px-4 py-2" aria-label={`Trend for row ${i + 1}`}><Spark data={r.spark} color={col(d.keys.indexOf(r.name))} className="h-7 w-24" /></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-input font-medium">
            <td className="sticky left-0 bg-card px-4 py-3">Total</td>
            <td className="metric-numbers px-4 py-3 text-right">{fmtMoney(d.total)}</td>
            <td className="metric-numbers px-4 py-3 text-right text-muted-foreground">{fmtMoney(d.previousTotal)}</td>
            <td className={`metric-numbers px-4 py-3 text-right ${totalChange > 0 ? "text-warning" : "text-success"}`}>{totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}%</td>
            <td className="metric-numbers px-4 py-3 text-right">100.0%</td><td />
          </tr></tfoot>
        </table>
      </div>
      {lim.limited && <ShowAllButton total={lim.total} onClick={lim.showAll} />}
    </article>
  );
}
