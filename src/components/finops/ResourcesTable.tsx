import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Ban, ChevronLeft, ChevronRight, Columns3, Download, Lightbulb, Rows3, Search, Server, Tag, Users } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/finops-data";
import { teams } from "@/lib/filters";
import { useResource, useResources } from "@/lib/queries";
import { CardSkeleton, DataTableView, EmptyState, ErrorState, StatusBadge, TableToggle } from "./States";
import type { ResourceRow } from "@/types/finops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SortKey = "name" | "provider" | "service" | "region" | "environment" | "team" | "monthlyCost" | "cpuAvg" | "memAvg" | "status";
export interface TableSearch { q: string; sort: string; dir: string; page: number; size: number; id: string; status: string; service: string }

const columns: { k: SortKey; label: string; num?: boolean }[] = [
  { k: "name", label: "Name" }, { k: "provider", label: "Provider" }, { k: "service", label: "Service" }, { k: "region", label: "Region" },
  { k: "environment", label: "Environment" }, { k: "team", label: "Team" }, { k: "monthlyCost", label: "Cost / mo", num: true },
  { k: "cpuAvg", label: "CPU avg", num: true }, { k: "memAvg", label: "Memory avg", num: true }, { k: "status", label: "Status" },
];
const sortKeys = columns.map((c) => c.k);
const tone = { Running: "success", Warning: "warning", Idle: "idle" } as const;
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const Label = ({ children }: { children: ReactNode }) => <p className="font-mono text-[10px] text-muted-foreground">{children}</p>;

/** Clamp raw URL values into safe table state. */
export function normalizeTable(s: TableSearch) {
  return {
    q: s.q.slice(0, 100),
    sort: (sortKeys as string[]).includes(s.sort) ? (s.sort as SortKey) : "monthlyCost",
    dir: s.dir === "asc" ? "asc" : "desc",
    size: [25, 50, 100].includes(s.size) ? s.size : 25,
    page: Math.max(1, Math.floor(s.page) || 1),
    status: ["Running", "Idle", "Warning"].includes(s.status) ? s.status : "All",
    service: s.service || "All",
    id: s.id,
  } as const;
}

export function toCsv(rows: ResourceRow[]) {
  const esc = (v: string | number) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return [["id", "name", "provider", "service", "sku", "region", "environment", "team", "monthly_cost_usd", "cpu_avg_pct", "mem_avg_pct", "status"].join(","),
    ...rows.map((r) => [r.id, r.name, r.provider, r.service, r.sku, r.region, r.environment, r.team, r.monthlyCost, r.cpuAvg, r.memAvg, r.status].map(esc).join(","))].join("\n");
}

type Bulk = "tag" | "assign" | "stop" | null;

export function ResourcesWorkspace({ search, setSearch }: { search: TableSearch; setSearch: (p: Partial<TableSearch>) => void }) {
  const s = normalizeTable(search);
  const q = useResources();
  const [text, setText] = useState(s.q);
  const [hidden, setHidden] = useState<Set<SortKey>>(new Set());
  const [compact, setCompact] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<Bulk>(null);
  const [bulkValue, setBulkValue] = useState("");

  useEffect(() => setText(s.q), [s.q]);
  useEffect(() => { if (text === s.q) return; const t = window.setTimeout(() => setSearch({ q: text, page: 1 }), 300); return () => window.clearTimeout(t); }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = q.data?.items ?? [];
  const services = useMemo(() => [...new Set(items.map((r) => r.service))].sort(), [items]);
  const filtered = useMemo(() => {
    const needle = s.q.toLowerCase();
    const rows = items.filter((r) => (s.status === "All" || r.status === s.status) && (s.service === "All" || r.service === s.service) && (!needle || `${r.name} ${r.id} ${r.service} ${r.region} ${r.team} ${r.sku}`.toLowerCase().includes(needle)));
    const dir = s.dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => { const x = a[s.sort], y = b[s.sort]; return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir; });
  }, [items, s.q, s.status, s.service, s.sort, s.dir]);
  const pages = Math.max(1, Math.ceil(filtered.length / s.size));
  const page = Math.min(s.page, pages);
  const rows = filtered.slice((page - 1) * s.size, page * s.size);
  const visible = columns.filter((c) => !hidden.has(c.k));
  const selectedRows = items.filter((r) => selected.has(r.id));
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  if (q.isPending) return <CardSkeleton h="h-96" />;
  if (q.isError) return <ErrorState message="We couldn't load resources. Check your connection and try again." onRetry={() => q.refetch()} />;
  const d = q.data;

  const exportSelected = () => {
    const url = URL.createObjectURL(new Blob([toCsv(selectedRows)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `nimbusops-resources-${selectedRows.length}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedRows.length} resources`);
  };
  const confirmBulk = () => {
    const n = selectedRows.length;
    toast.success(bulk === "tag" ? `Tag "${bulkValue}" queued for ${n} resources (demo)` : bulk === "assign" ? `${n} resources assigned to ${bulkValue} (demo)` : `Stop requested for ${n} resources (demo)`);
    setBulk(null); setBulkValue(""); setSelected(new Set());
  };
  const py = compact ? "py-1.5" : "py-3";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Resources" value={d.count.toLocaleString("en-US")} />
        <Stat label="Monthly cost (last 30 days)" value={fmtUSD(d.monthlyTotal)} />
        <Stat label="Spend in selected period" value={fmtUSD(d.periodTotal)} />
      </div>

      <article className="organic-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-secondary px-3 sm:max-w-72">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input aria-label="Search resources" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name, region, team…" />
          </label>
          <Select value={s.status} onValueChange={(v) => setSearch({ status: v, page: 1 })}>
            <SelectTrigger className="h-10 w-[130px] rounded-xl" aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent>{["All", "Running", "Warning", "Idle"].map((x) => <SelectItem key={x} value={x}>{x === "All" ? "All statuses" : x}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={s.service} onValueChange={(v) => setSearch({ service: v, page: 1 })}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl" aria-label="Service"><SelectValue /></SelectTrigger>
            <SelectContent>{["All", ...services].map((x) => <SelectItem key={x} value={x}>{x === "All" ? "All services" : x}</SelectItem>)}</SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="secondary" className="h-10 rounded-xl" aria-label="Columns"><Columns3 /><span className="hidden sm:inline">Columns</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Show columns</DropdownMenuLabel><DropdownMenuSeparator />
                {columns.filter((c) => c.k !== "name").map((c) => (
                  <DropdownMenuCheckboxItem key={c.k} checked={!hidden.has(c.k)} onSelect={(e) => e.preventDefault()} onCheckedChange={(on) => setHidden((h) => { const n = new Set(h); if (on) n.delete(c.k); else n.add(c.k); return n; })}>{c.label}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" className="h-10 rounded-xl" aria-pressed={compact} onClick={() => setCompact((c) => !c)}><Rows3 /><span className="hidden sm:inline">{compact ? "Comfortable" : "Compact"}</span></Button>
          </div>
        </div>

        {selected.size > 0 && (
          <div role="toolbar" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 border-y border-border bg-secondary px-4 py-2">
            <span className="text-sm">{selected.size} selected</span>
            <Button size="sm" variant="ghost" className="h-10" onClick={() => setBulk("tag")}><Tag />Tag</Button>
            <Button size="sm" variant="ghost" className="h-10" onClick={() => { setBulkValue(teams[0]!); setBulk("assign"); }}><Users />Assign to team</Button>
            <Button size="sm" variant="ghost" className="h-10" onClick={() => setBulk("stop")}><Ban />Stop</Button>
            <Button size="sm" variant="ghost" className="h-10" onClick={exportSelected}><Download />Export selected</Button>
            <Button size="sm" variant="ghost" className="ml-auto h-10 text-muted-foreground" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="p-4"><EmptyState icon={Server} title="No resources match these filters or this search." action="Clear search and quick filters" onAction={() => { setText(""); setSearch({ q: "", status: "All", service: "All", page: 1 }); }} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">Cloud resources</caption>
              <thead className="font-mono text-[10px] text-muted-foreground">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-12 bg-card px-3"><Checkbox aria-label="Select all on page" className="size-5" checked={allOnPage} onCheckedChange={(on) => setSelected((cur) => { const n = new Set(cur); rows.forEach((r) => (on ? n.add(r.id) : n.delete(r.id))); return n; })} /></th>
                  {visible.map((c) => (
                    <th key={c.k} scope="col" aria-sort={s.sort === c.k ? (s.dir === "asc" ? "ascending" : "descending") : "none"} className={`whitespace-nowrap px-3 font-medium ${c.k === "name" ? "sticky left-12 z-10 bg-card" : ""} ${c.num ? "text-right" : ""}`}>
                      <button className="inline-flex min-h-10 items-center gap-1 hover:text-foreground" onClick={() => setSearch({ sort: c.k, dir: s.sort === c.k && s.dir === "desc" ? "asc" : "desc" })}>
                        {c.label}{s.sort === c.k && (s.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="group cursor-pointer border-t border-border hover:bg-secondary" onClick={() => setSearch({ id: r.id })}>
                    <td className={`sticky left-0 z-10 bg-card px-3 ${py} group-hover:bg-secondary`} onClick={(e) => e.stopPropagation()}>
                      <Checkbox aria-label={`Select ${r.name}`} className="size-5" checked={selected.has(r.id)} onCheckedChange={(on) => setSelected((cur) => { const n = new Set(cur); if (on) n.add(r.id); else n.delete(r.id); return n; })} />
                    </td>
                    {visible.map((c) => <Cell key={c.k} k={c.k} r={r} py={py} num={c.num} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span className="metric-numbers">{filtered.length ? (page - 1) * s.size + 1 : 0}–{Math.min(page * s.size, filtered.length)} of {filtered.length}</span>
          <Select value={String(s.size)} onValueChange={(v) => setSearch({ size: Number(v), page: 1 })}>
            <SelectTrigger className="h-10 w-[110px] rounded-xl" aria-label="Rows per page"><SelectValue /></SelectTrigger>
            <SelectContent>{[25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1">
            <Button size="icon" variant="ghost" className="size-10" aria-label="Previous page" disabled={page <= 1} onClick={() => setSearch({ page: page - 1 })}><ChevronLeft /></Button>
            <span className="metric-numbers px-2">{page} / {pages}</span>
            <Button size="icon" variant="ghost" className="size-10" aria-label="Next page" disabled={page >= pages} onClick={() => setSearch({ page: page + 1 })}><ChevronRight /></Button>
          </div>
        </div>
      </article>

      <AlertDialog open={bulk !== null} onOpenChange={(o) => !o && setBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bulk === "tag" ? "Tag resources" : bulk === "assign" ? "Assign to team" : "Stop resources"}</AlertDialogTitle>
            <AlertDialogDescription>This applies to {selectedRows.length} selected resources. Demo mode — nothing is actually changed.</AlertDialogDescription>
          </AlertDialogHeader>
          {bulk === "tag" && <Input autoFocus value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} placeholder="key:value, e.g. owner:platform" maxLength={60} aria-label="Tag" />}
          {bulk === "assign" && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger className="h-10 w-full rounded-xl" aria-label="Team"><SelectValue /></SelectTrigger>
              <SelectContent>{teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={bulk === "tag" && !bulkValue.trim()} onClick={confirmBulk}>{bulk === "stop" ? "Stop resources" : "Confirm"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResourceDrawer id={s.id} onClose={() => setSearch({ id: "" })} />
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="organic-card p-5"><Label>{label}</Label><p className="metric-numbers mt-2 text-2xl" aria-live="polite">{value}</p></div>
);

function Cell({ k, r, py, num }: { k: SortKey; r: ResourceRow; py: string; num?: boolean | undefined }) {
  const cls = `px-3 ${py} ${num ? "metric-numbers text-right" : ""}`;
  if (k === "name") return <td className={`sticky left-12 z-10 max-w-[220px] bg-card px-3 ${py} group-hover:bg-secondary`}><p className="truncate font-medium">{r.name}</p><p className="truncate text-[11px] text-muted-foreground">{r.sku}</p></td>;
  if (k === "monthlyCost") return <td className={cls}>{fmtUSD(r.monthlyCost)}</td>;
  if (k === "cpuAvg" || k === "memAvg") return <td className={`${cls} ${k === "cpuAvg" && r.cpuAvg < 25 ? "text-warning" : ""}`}>{r[k]}%</td>;
  if (k === "status") return <td className={cls}><StatusBadge tone={tone[r.status]}>{r.status}</StatusBadge></td>;
  return <td className={`${cls} whitespace-nowrap text-muted-foreground`}>{r[k]}</td>;
}

function ResourceDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useResource(id || undefined);
  const [costTable, setCostTable] = useState(false);
  const [utilTable, setUtilTable] = useState(false);
  const d = q.data;
  const axis = { tick: { fontSize: 10, fill: "var(--muted-foreground)" }, tickLine: false, axisLine: false } as const;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {q.isPending && <div className="p-4"><CardSkeleton h="h-64" /></div>}
        {q.isError && <div className="p-4"><ErrorState message="We couldn't load this resource." onRetry={() => q.refetch()} /></div>}
        {q.isSuccess && !d && <><SheetHeader><SheetTitle>Resource not found</SheetTitle><SheetDescription>The link points to a resource that no longer exists.</SheetDescription></SheetHeader></>}
        {d && <>
          <SheetHeader>
            <SheetTitle className="break-all">{d.resource.name}</SheetTitle>
            <SheetDescription>{d.resource.provider} {d.resource.service} · {d.resource.sku} · {d.resource.region}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6">
            {d.rightsizing && (
              <div className="rounded-xl bg-success-soft p-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-success"><Lightbulb className="size-4" />Right-sizing suggestion</p>
                <p className="mt-1">{d.rightsizing.action}. CPU avg {d.resource.cpuAvg}%.</p>
                {d.rightsizing.saving > 0 && <p className="metric-numbers mt-1">Est. saving {fmtUSD(d.rightsizing.saving)}/mo</p>}
              </div>
            )}
            <Tabs defaultValue="overview">
              <TabsList className="grid h-auto w-full grid-cols-5">
                {["overview", "cost", "utilization", "tags", "activity"].map((t) => <TabsTrigger key={t} value={t} className="min-h-10 px-1 text-xs capitalize">{t}</TabsTrigger>)}
              </TabsList>
              <TabsContent value="overview">
                <dl className="divide-y divide-border">
                  {([["Status", <StatusBadge key="s" tone={tone[d.resource.status]}>{d.resource.status}</StatusBadge>], ["Monthly cost", fmtUSD(d.resource.monthlyCost)], ["Environment", d.resource.environment], ["Team", d.resource.team], ["Region", d.resource.region], ["CPU avg", `${d.resource.cpuAvg}%`], ["Memory avg", `${d.resource.memAvg}%`], ["Resource ID", d.resource.id]] as [string, ReactNode][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="metric-numbers text-right">{v}</dd></div>
                  ))}
                </dl>
              </TabsContent>
              <TabsContent value="cost">
                <div className="flex items-center justify-between"><Label>Daily cost · last 90 days</Label><TableToggle on={costTable} onChange={setCostTable} /></div>
                <div className="mt-3 h-64">
                  {costTable ? <DataTableView caption="Daily cost" columns={["Day", "Cost"]} rows={d.cost.map((c) => [c.day, `$${c.cost.toFixed(2)}`])} /> :
                  <ResponsiveContainer><AreaChart data={d.cost} margin={{ left: -6, right: 8 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="day" {...axis} minTickGap={28} /><YAxis {...axis} width={48} tickFormatter={(v) => `$${Math.round(Number(v))}`} />
                    <Tooltip contentStyle={tip} formatter={(v) => [`$${Number(v).toFixed(2)}`, "Cost"]} />
                    <Area dataKey="cost" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.1} strokeWidth={1.5} />
                  </AreaChart></ResponsiveContainer>}
                </div>
              </TabsContent>
              <TabsContent value="utilization">
                <div className="flex items-center justify-between"><Label>CPU and memory · last 90 days</Label><TableToggle on={utilTable} onChange={setUtilTable} /></div>
                <div className="mt-3 h-64">
                  {utilTable ? <DataTableView caption="Utilization" columns={["Day", "CPU %", "Memory %"]} rows={d.util.map((u) => [u.day, u.cpu.toFixed(0), u.mem.toFixed(0)])} /> :
                  <ResponsiveContainer><LineChart data={d.util} margin={{ left: -6, right: 8 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="day" {...axis} minTickGap={28} /><YAxis {...axis} width={40} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={tip} formatter={(v, n) => [`${Number(v).toFixed(0)}%`, String(n)]} />
                    <Line dataKey="cpu" name="CPU" stroke="var(--chart-2)" dot={false} strokeWidth={1.5} /><Line dataKey="mem" name="Memory" stroke="var(--chart-3)" dot={false} strokeWidth={1.5} />
                  </LineChart></ResponsiveContainer>}
                </div>
              </TabsContent>
              <TabsContent value="tags">
                <ul className="flex flex-wrap gap-2 pt-2">{Object.entries(d.tags).map(([k, v]) => <li key={k} className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs"><span className="text-muted-foreground">{k}:</span> {v}</li>)}</ul>
              </TabsContent>
              <TabsContent value="activity">
                <ol className="space-y-3 pt-2">{d.activity.map((a, i) => <li key={i} className="flex gap-3 text-sm"><span className="metric-numbers w-14 shrink-0 text-xs text-muted-foreground">{a.day}</span><StatusBadge tone={a.tone}>{a.text}</StatusBadge></li>)}</ol>
              </TabsContent>
            </Tabs>
          </div>
        </>}
      </SheetContent>
    </Sheet>
  );
}
