import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BellOff, Check, Copy, EyeOff, Lightbulb, PlayCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/finops-data";
import { useSavings } from "@/lib/queries";
import { teams } from "@/lib/filters";
import { recStatus, setSession, useSession, type RecStatus } from "@/lib/session-store";
import type { Level, SavingCategory, SavingItemDto, SavingsDto } from "@/types/finops";
import { CardBoundary, CardSkeleton, DataTableView, EmptyState, ErrorState, TableToggle } from "./States";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface RecSearch { cat: string; effort: string; risk: string; status: string; sort: string }
export const categories: SavingCategory[] = ["Idle resources", "Right-sizing", "Reserved / Savings Plans", "Storage tiering", "Unused volumes and IPs", "Scheduling"];
const levels: Level[] = ["Low", "Medium", "High"];
const statuses: RecStatus[] = ["Open", "In progress", "Done", "Ignored", "Snoozed"];
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const Demo = () => <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Demo</span>;
const Pill = ({ c, children }: { c: string; children: ReactNode }) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
const levelTone: Record<Level, string> = { Low: "bg-success-soft text-success", Medium: "bg-warning-soft text-warning", High: "bg-destructive-soft text-destructive" };
const statusTone: Record<RecStatus, string> = { Open: "bg-secondary text-foreground", "In progress": "bg-warning-soft text-warning", Done: "bg-success-soft text-success", Ignored: "bg-secondary text-muted-foreground", Snoozed: "bg-secondary text-muted-foreground" };

export function RecommendationsWorkspace({ search, setSearch }: { search: RecSearch; setSearch: (p: Partial<RecSearch>) => void }) {
  const q = useSavings();
  if (q.isPending) return <div className="grid gap-6"><CardSkeleton h="h-20" /><CardSkeleton h="h-64" /></div>;
  if (q.isError || !q.data) return <ErrorState message="We couldn't load recommendations. Check your connection and try again." onRetry={() => q.refetch()} />;
  return <CardBoundary onReset={() => q.refetch()}><Workspace d={q.data} search={search} setSearch={setSearch} /></CardBoundary>;
}

function Workspace({ d, search, setSearch }: { d: SavingsDto; search: RecSearch; setSearch: (p: Partial<RecSearch>) => void }) {
  const recs = useSession((s) => s.recs);
  const [review, setReview] = useState<SavingItemDto | null>(null);
  const [ignore, setIgnore] = useState<SavingItemDto | null>(null);
  const [assign, setAssign] = useState<SavingItemDto | null>(null);
  const st = (id: string) => recStatus(recs, id);
  const open = d.items.filter((i) => st(i.id) === "Open" || st(i.id) === "In progress").reduce((a, b) => a + b.savings, 0);
  const done = d.items.filter((i) => st(i.id) === "Done").reduce((a, b) => a + b.savings, 0);
  const setStatus = (id: string, status: RecStatus, extra: { team?: string; reason?: string } = {}) => setSession((s) => ({ ...s, recs: { ...s.recs, [id]: { ...s.recs[id], status, ...extra } } }));

  const list = d.items
    .filter((i) => (search.cat === "All" || i.category === search.cat) && (search.effort === "All" || i.effort === search.effort) && (search.risk === "All" || i.risk === search.risk) && (search.status === "All" || st(i.id) === search.status))
    .sort((a, b) => (search.sort === "savings-asc" ? a.savings - b.savings : b.savings - a.savings));
  const filtersOn = search.cat !== "All" || search.effort !== "All" || search.risk !== "All" || search.status !== "All";

  return (
    <div className="grid gap-6">
      <section className="organic-card p-6 md:p-8" aria-label="Savings summary">
        <div className="grid gap-6 sm:grid-cols-3">
          <div><p className="text-[13px] text-muted-foreground">Open savings</p><p className="mt-1 font-display text-[30px] leading-none tabular-nums">{fmtUSD(open)}<span className="text-base text-muted-foreground">/mo</span></p></div>
          <div><p className="flex items-center gap-2 text-[13px] text-muted-foreground">Done this session <Demo /></p><p className="mt-1 font-display text-[30px] leading-none tabular-nums text-success">{fmtUSD(done)}</p></div>
          <div><p className="text-[13px] text-muted-foreground">Monthly target</p><p className="mt-1 font-display text-[30px] leading-none tabular-nums">{fmtUSD(d.target)}</p></div>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Progress toward target</span><span className="tabular-nums">{d.target ? Math.round((done / d.target) * 100) : 0}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={d.target ? Math.round((done / d.target) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${d.target ? Math.min(100, (done / d.target) * 100) : 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Target = {Math.round(d.targetShare * 100)}% of total potential ({fmtUSD(d.total)}/mo). Statuses are demo-only and reset when you reload.</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="organic-card min-w-0 p-6" aria-label="Recommendations">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label="Category" value={search.cat} options={categories} onChange={(v) => setSearch({ cat: v })} />
            <FilterSelect label="Effort" value={search.effort} options={levels} onChange={(v) => setSearch({ effort: v })} />
            <FilterSelect label="Risk" value={search.risk} options={levels} onChange={(v) => setSearch({ risk: v })} />
            <FilterSelect label="Status" value={search.status} options={statuses} onChange={(v) => setSearch({ status: v })} />
            <Select value={search.sort} onValueChange={(v) => setSearch({ sort: v })}>
              <SelectTrigger className="h-10 w-auto min-w-40 rounded-xl" aria-label="Sort"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="savings-desc">Savings: high to low</SelectItem><SelectItem value="savings-asc">Savings: low to high</SelectItem></SelectContent>
            </Select>
          </div>
          {list.length === 0 ? (
            <div className="mt-5"><EmptyState icon={Lightbulb} title={d.items.length ? "No recommendations match these filters." : "No savings found for the selected global filters."} action={filtersOn ? "Clear filters" : "Show all statuses"} onAction={() => setSearch({ cat: "All", effort: "All", risk: "All", status: "All" })} /></div>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {list.map((i) => {
                const s = st(i.id);
                return (
                  <li key={i.id} className={`flex flex-col gap-3 py-4 lg:flex-row lg:items-center ${s === "Ignored" || s === "Snoozed" ? "opacity-60" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{i.title}</p><Pill c={statusTone[s]}>{s}</Pill>{recs[i.id]?.team && <Pill c="bg-secondary text-muted-foreground">{recs[i.id]!.team}</Pill>}</div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{i.category}</span>
                        <Link to="/resources" search={{ ids: i.resourceIds.join(",") } as never} className="underline-offset-2 hover:underline">{i.resourceIds.length} resource{i.resourceIds.length > 1 ? "s" : ""}</Link>
                        <span>Effort <Pill c={levelTone[i.effort]}>{i.effort}</Pill></span>
                        <span>Risk <Pill c={levelTone[i.risk]}>{i.risk}</Pill></span>
                        <span className="tabular-nums">{i.confidence}% confidence</span>
                      </p>
                    </div>
                    <p className="metric-numbers shrink-0 text-sm font-medium">{fmtUSD(i.savings)}/mo</p>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Button size="sm" className="h-10" onClick={() => setReview(i)}>Review</Button>
                      {s === "Open" && <Button size="sm" variant="secondary" className="h-10" onClick={() => { setStatus(i.id, "In progress"); toast("Marked in progress (demo)"); }}><PlayCircle />In progress</Button>}
                      {s === "In progress" && <Button size="sm" variant="secondary" className="h-10" onClick={() => { setStatus(i.id, "Done"); toast.success("Marked done (demo)"); }}><Check />Done</Button>}
                      {(s === "Open" || s === "In progress") && <>
                        <Button size="icon" variant="ghost" className="size-10" aria-label="Assign to team" onClick={() => setAssign(i)}><UserPlus /></Button>
                        <Button size="icon" variant="ghost" className="size-10" aria-label="Snooze" onClick={() => { setStatus(i.id, "Snoozed"); toast("Snoozed for 7 days (demo)"); }}><BellOff /></Button>
                        <Button size="icon" variant="ghost" className="size-10" aria-label="Ignore" onClick={() => setIgnore(i)}><EyeOff /></Button>
                      </>}
                      {(s === "Ignored" || s === "Snoozed" || s === "Done") && <Button size="sm" variant="ghost" className="h-10" onClick={() => setStatus(i.id, "Open")}>Reopen</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <div className="grid content-start gap-6">
          <Tracker d={d} open={open} />
          <Rules d={d} />
        </div>
      </div>

      <ReviewDrawer item={review} onClose={() => setReview(null)} />
      <IgnoreDialog item={ignore} onClose={() => setIgnore(null)} onConfirm={(reason) => { setStatus(ignore!.id, "Ignored", { reason }); toast("Ignored (demo)"); setIgnore(null); }} />
      <AssignDialog item={assign} onClose={() => setAssign(null)} onConfirm={(team) => { setStatus(assign!.id, recStatus(recs, assign!.id), { team }); toast(`Assigned to ${team} (demo)`); setAssign(null); }} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-auto min-w-32 rounded-xl" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="All">All {label.toLowerCase()}</SelectItem>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Tracker({ d, open }: { d: SavingsDto; open: number }) {
  const [table, setTable] = useState(false);
  const data = d.tracker.map((m, i) => (i === d.tracker.length - 1 ? { ...m, potential: open } : m));
  return (
    <section className="organic-card p-6" aria-label="Savings tracker">
      <div className="flex items-start justify-between gap-3">
        <div><p className="flex items-center gap-2 text-[15px] font-medium">Savings tracker <Demo /></p><p className="mt-1 text-[13px] text-muted-foreground">Realized (seeded demo) vs potential, last 6 months</p></div>
        <TableToggle on={table} onChange={setTable} />
      </div>
      <div className="mt-4 h-60">
        {table ? <DataTableView caption="Savings per month" columns={["Month", "Realized (demo)", "Potential"]} rows={data.map((m) => [m.month, fmtUSD(m.realized), fmtUSD(m.potential)])} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickFormatter={(v: string) => v.slice(0, 3)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis width={48} tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tip} formatter={(v) => fmtUSD(Number(v))} cursor={{ fill: "var(--secondary)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="potential" name="Potential" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="realized" name="Realized (demo)" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function Rules({ d }: { d: SavingsDto }) {
  return (
    <details className="organic-card p-6">
      <summary className="cursor-pointer text-[15px] font-medium">How savings are calculated</summary>
      <ul className="mt-4 space-y-3 text-[13px] text-muted-foreground">
        {d.rules.map((r) => <li key={r.category}><span className="font-medium text-foreground">{r.category}</span> — {r.rule} Effort {r.effort}, risk {r.risk}, confidence {r.confidence}%.</li>)}
        <li>Each resource counts in one category only, in the order above, so savings are never double counted. All figures are estimates.</li>
      </ul>
    </details>
  );
}

function snippet(i: SavingItemDto) {
  return `# ${i.title}
resource "nimbus_optimization" "${i.id}" {
  category    = "${i.category}"
  owner_team  = "${i.team}"
  resources   = [${i.resourceIds.map((r) => `"${r}"`).join(", ")}]
  est_savings = ${i.savings}
}

$ nimbus optimize apply --id ${i.id} --dry-run`;
}

function ReviewDrawer({ item, onClose }: { item: SavingItemDto | null; onClose: () => void }) {
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {item && (<>
          <SheetHeader><SheetTitle>{item.title}</SheetTitle><SheetDescription>{item.category} · {item.detail}</SheetDescription></SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-success-soft p-4"><p className="text-xs text-muted-foreground">Estimated saving</p><p className="metric-numbers mt-1 text-xl text-success">{fmtUSD(item.savings)}/mo</p></div>
              <div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Effort · Risk · Confidence</p><p className="mt-1 text-sm font-medium">{item.effort} · {item.risk} · {item.confidence}%</p></div>
            </div>
            <div>
              <p className="text-sm font-medium">Affected resources ({item.resourceIds.length})</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">{item.resourceIds.map((r) => <li key={r}><Link to="/resources" search={{ id: r } as never} className="inline-flex rounded-full bg-secondary px-2.5 py-1 font-mono text-[11px] hover:bg-muted">{r}</Link></li>)}</ul>
              <Button asChild size="sm" variant="secondary" className="mt-3 h-10"><Link to="/resources" search={{ ids: item.resourceIds.join(",") } as never}>Open on Resources</Link></Button>
            </div>
            <div>
              <div className="flex items-center justify-between"><p className="text-sm font-medium">Terraform / CLI</p>
                <Button size="sm" variant="ghost" className="h-10" onClick={() => { navigator.clipboard?.writeText(snippet(item)).then(() => toast.success("Copied"), () => toast.error("Couldn't copy")); }}><Copy />Copy</Button></div>
              <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{snippet(item)}</pre>
            </div>
            <p className="text-xs text-muted-foreground">Demo — no changes are applied to your cloud accounts.</p>
          </div>
        </>)}
      </SheetContent>
    </Sheet>
  );
}

function IgnoreDialog({ item, onClose, onConfirm }: { item: SavingItemDto | null; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) { onClose(); setReason(""); setErr(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ignore recommendation</DialogTitle><DialogDescription>{item?.title}</DialogDescription></DialogHeader>
        <label className="text-sm font-medium" htmlFor="ignore-reason">Reason</label>
        <Textarea id="ignore-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!err} placeholder="e.g. Capacity reserved for Black Friday" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => { if (reason.trim().length < 3) { setErr("Add a short reason (at least 3 characters)."); return; } onConfirm(reason.trim()); setReason(""); setErr(""); }}>Ignore</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ item, onClose, onConfirm }: { item: SavingItemDto | null; onClose: () => void; onConfirm: (team: string) => void }) {
  const [team, setTeam] = useState<string>(teams[0]!);
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign to team</DialogTitle><DialogDescription>{item?.title}</DialogDescription></DialogHeader>
        <Select value={team} onValueChange={setTeam}><SelectTrigger className="h-10 rounded-xl" aria-label="Team"><SelectValue /></SelectTrigger><SelectContent>{teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <DialogFooter><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onConfirm(team)}>Assign</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
