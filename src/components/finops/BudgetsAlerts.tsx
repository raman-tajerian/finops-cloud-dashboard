import { useState, type ReactNode } from "react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BellRing, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/finops-data";
import { useAlerts } from "@/lib/queries";
import { budgetTone } from "@/lib/scenario";
import { parseAmount, scopeKey, validateBudget } from "@/data/budgets";
import { setSession, useSession, type AlertRule, type AnomalyStatus, type SessionBudget } from "@/lib/session-store";
import type { AlertsDto, AnomalyRowDto, ScopeSpendDto } from "@/types/finops";
import { CardBoundary, CardSkeleton, DataTableView, EmptyState, ErrorState, StatusBadge, TableToggle } from "./States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" };
const toneColor = { success: "var(--success)", warning: "var(--warning)", critical: "var(--destructive)" } as const;
const Demo = () => <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Demo</span>;
const Title = ({ children, sub, right }: { children: ReactNode; sub?: ReactNode; right?: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[15px] font-medium leading-snug">{children}</p>{sub && <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>}</div>{right}</div>
);
const scopeLabel = (s: ScopeSpendDto["scope"]) => (s.kind === "All" ? "All spend" : `${s.kind}: ${s.value}`);

/** Built-in budgets shown on load. Amount = default (105% of Q3 ÷ 3) for that scope. */
const seeded = [
  { id: "b-all", name: "Company cloud budget", key: "All:All" },
  { id: "b-aws", name: "AWS", key: "Provider:AWS" },
  { id: "b-azure", name: "Azure", key: "Provider:Azure" },
  { id: "b-platform", name: "Platform team", key: "Team:Platform" },
  { id: "b-prod", name: "Production", key: "Environment:Production" },
];

export function BudgetsAlertsWorkspace() {
  const q = useAlerts();
  if (q.isPending) return <div className="grid gap-6"><CardSkeleton h="h-32" /><CardSkeleton h="h-48" /></div>;
  if (q.isError || !q.data) return <ErrorState message="We couldn't load budgets and alerts. Check your connection and try again." onRetry={() => q.refetch()} />;
  return <CardBoundary onReset={() => q.refetch()}><Workspace d={q.data} /></CardBoundary>;
}

function Workspace({ d }: { d: AlertsDto }) {
  return (
    <div className="grid gap-6">
      <BudgetCards d={d} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AlertRules />
        <Anomalies rows={d.anomalies} />
      </div>
    </div>
  );
}

/* ---------- Budget cards ---------- */
function BudgetCards({ d }: { d: AlertsDto }) {
  const session = useSession((s) => s.budgets);
  const [open, setOpen] = useState(false);
  const byKey = new Map(d.scopes.map((s) => [s.key, s]));
  const cards = [
    ...seeded.map((b) => { const s = byKey.get(b.key)!; return { id: b.id, name: b.name, s, amount: s.defaultAmount, period: "monthly" as const, demo: false }; }),
    ...session.map((b) => ({ id: b.id, name: b.name, s: byKey.get(b.scope)!, amount: b.period === "quarterly" ? b.amount / 3 : b.amount, period: b.period, demo: true })),
  ].filter((c) => c.s);
  return (
    <section className="organic-card p-6 md:p-8" aria-label="Budgets">
      <Title sub="Spent uses the same totals as Overview for the selected period; forecast is the Overview end-of-month forecast for each scope." right={<Button className="h-10" onClick={() => setOpen(true)}><Plus />Create budget</Button>}>Budgets</Title>
      {cards.length === 0 ? <div className="mt-5"><EmptyState icon={Wallet} title="No budgets yet." action="Create budget" onAction={() => setOpen(true)} /></div> : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => {
            const pct = c.amount > 0 ? (c.s.forecast / c.amount) * 100 : 0, tone = budgetTone(pct);
            return (
              <article key={c.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{scopeLabel(c.s.scope)} · {c.period}</p></div><div className="flex shrink-0 items-center gap-1.5">{c.demo && <Demo />}<StatusBadge tone={tone}>{pct.toFixed(0)}%</StatusBadge></div></div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted-foreground">Budget / mo</dt><dd className="metric-numbers mt-0.5 text-sm">{fmtUSD(c.amount)}</dd></div><div><dt className="text-muted-foreground">Spent</dt><dd className="metric-numbers mt-0.5 text-sm">{fmtUSD(c.s.spent)}</dd></div><div><dt className="text-muted-foreground">Forecast</dt><dd className="metric-numbers mt-0.5 text-sm">{fmtUSD(c.s.forecast)}</dd></div></dl>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${c.name} forecast vs budget`} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: toneColor[tone] }} />
                </div>
              </article>
            );
          })}
        </div>
      )}
      <CreateBudgetDialog open={open} onOpenChange={setOpen} scopes={d.scopes} />
    </section>
  );
}

const thresholdsAll = [50, 80, 100] as const;
const channelsAll = ["Email", "Slack", "Teams"] as const;
function CreateBudgetDialog({ open, onOpenChange, scopes }: { open: boolean; onOpenChange: (o: boolean) => void; scopes: ScopeSpendDto[] }) {
  const blank = { name: "", scope: "", amount: "", period: "monthly", thresholds: [80, 100] as number[], channels: ["Email"] as string[] };
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const err = (k: string) => errors[k] && <p id={`b-${k}-err`} className="text-xs text-destructive">{errors[k]}</p>;
  const submit = () => {
    const r = validateBudget({ ...f, amount: parseAmount(f.amount) });
    if (!r.ok) { setErrors(r.errors); return; }
    const b: SessionBudget = { id: `b-${Date.now()}`, ...r.data, demo: true };
    setSession((s) => ({ ...s, budgets: [...s.budgets, b] }));
    toast.success(`Budget "${b.name}" created (demo)`);
    setF(blank); setErrors({}); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setErrors({}); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create budget</DialogTitle><DialogDescription>Demo — budgets are kept for this session only.</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><label htmlFor="b-name" className="text-sm font-medium">Name</label><Input id="b-name" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!errors["name"]} aria-describedby="b-name-err" className="h-10 rounded-xl" />{err("name")}</div>
          <div className="grid gap-1.5"><span className="text-sm font-medium">Scope</span>
            <Select value={f.scope} onValueChange={(v) => setF({ ...f, scope: v })}><SelectTrigger className="h-10 rounded-xl" aria-label="Scope" aria-invalid={!!errors["scope"]}><SelectValue placeholder="Choose a scope" /></SelectTrigger>
              <SelectContent>{scopes.map((s) => <SelectItem key={s.key} value={scopeKey(s.scope)}>{scopeLabel(s.scope)}</SelectItem>)}</SelectContent></Select>{err("scope")}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><label htmlFor="b-amount" className="text-sm font-medium">Amount (USD)</label><Input id="b-amount" type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} aria-invalid={!!errors["amount"]} aria-describedby="b-amount-err" className="h-10 rounded-xl" />{err("amount")}</div>
            <div className="grid gap-1.5"><span className="text-sm font-medium">Period</span>
              <Select value={f.period} onValueChange={(v) => setF({ ...f, period: v })}><SelectTrigger className="h-10 rounded-xl" aria-label="Period"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select>{err("period")}</div>
          </div>
          <fieldset className="grid gap-1.5"><legend className="text-sm font-medium">Alert thresholds</legend><div className="flex gap-4">{thresholdsAll.map((t) => <label key={t} className="flex min-h-10 items-center gap-2 text-sm"><Checkbox checked={f.thresholds.includes(t)} onCheckedChange={() => setF({ ...f, thresholds: toggle(f.thresholds, t) })} />{t}%</label>)}</div>{err("thresholds")}</fieldset>
          <fieldset className="grid gap-1.5"><legend className="text-sm font-medium">Notification channels <span className="font-normal text-muted-foreground">(mock)</span></legend><div className="flex flex-wrap gap-4">{channelsAll.map((c) => <label key={c} className="flex min-h-10 items-center gap-2 text-sm"><Switch checked={f.channels.includes(c)} onCheckedChange={() => setF({ ...f, channels: toggle(f.channels, c) })} />{c}</label>)}</div>{err("channels")}</fieldset>
        </div>
        <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit}>Create budget</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Alert rules ---------- */
function AlertRules() {
  const rules = useSession((s) => s.rules);
  const [edit, setEdit] = useState<AlertRule | null>(null);
  const [del, setDel] = useState<AlertRule | null>(null);
  const update = (r: AlertRule) => setSession((s) => ({ ...s, rules: s.rules.map((x) => (x.id === r.id ? r : x)) }));
  return (
    <section className="organic-card min-w-0 p-6" aria-label="Alert rules">
      <Title sub="Demo — changes last for this session only.">Alert rules</Title>
      {rules.length === 0 ? <div className="mt-5"><EmptyState icon={BellRing} title="No alert rules." action="Restore defaults" onAction={() => window.location.reload()} /></div> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="py-2 font-medium">Rule</th><th className="py-2 font-medium">Channel</th><th className="py-2 font-medium">Enabled</th><th className="py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{rules.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-3 pr-3"><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.condition}</p></td>
                <td className="py-3 pr-3">{r.channel}</td>
                <td className="py-3 pr-3"><Switch checked={r.enabled} aria-label={`Enable ${r.name}`} onCheckedChange={(v) => { update({ ...r, enabled: v }); toast(`${r.name} ${v ? "enabled" : "disabled"} (demo)`); }} /></td>
                <td className="py-3 text-right whitespace-nowrap"><Button size="icon" variant="ghost" className="size-10" aria-label={`Edit ${r.name}`} onClick={() => setEdit(r)}><Pencil /></Button><Button size="icon" variant="ghost" className="size-10" aria-label={`Delete ${r.name}`} onClick={() => setDel(r)}><Trash2 /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <EditRuleDialog rule={edit} onClose={() => setEdit(null)} onSave={(r) => { update(r); toast.success("Rule updated (demo)"); setEdit(null); }} />
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete alert rule?</AlertDialogTitle><AlertDialogDescription>"{del?.name}" will be removed for this session.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setSession((s) => ({ ...s, rules: s.rules.filter((x) => x.id !== del!.id) })); toast("Rule deleted (demo)"); setDel(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function EditRuleDialog({ rule, onClose, onSave }: { rule: AlertRule | null; onClose: () => void; onSave: (r: AlertRule) => void }) {
  const [draft, setDraft] = useState<AlertRule | null>(null);
  const cur = draft?.id === rule?.id ? draft : rule;
  const [err, setErr] = useState("");
  return (
    <Dialog open={!!rule} onOpenChange={(o) => { if (!o) { onClose(); setDraft(null); setErr(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit alert rule</DialogTitle><DialogDescription>Demo — nothing is sent.</DialogDescription></DialogHeader>
        {cur && <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">Name<Input value={cur.name} maxLength={60} onChange={(e) => setDraft({ ...cur, name: e.target.value })} aria-invalid={!!err} className="h-10 rounded-xl" /></label>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="grid gap-1.5"><span className="text-sm font-medium">Channel</span><Select value={cur.channel} onValueChange={(v) => setDraft({ ...cur, channel: v })}><SelectTrigger className="h-10 rounded-xl" aria-label="Channel"><SelectValue /></SelectTrigger><SelectContent>{channelsAll.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        </div>}
        <DialogFooter><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => { if (!cur || cur.name.trim().length < 2) { setErr("Name must be at least 2 characters"); return; } onSave({ ...cur, name: cur.name.trim() }); setDraft(null); setErr(""); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Anomalies ---------- */
const anomalyStatuses: AnomalyStatus[] = ["New", "Investigating", "Resolved"];
function Anomalies({ rows }: { rows: AnomalyRowDto[] }) {
  const status = useSession((s) => s.anomalies);
  const [open, setOpen] = useState<AnomalyRowDto | null>(null);
  return (
    <section className="organic-card min-w-0 p-6" aria-label="Anomalies">
      <Title sub="Same anomalies as Overview: last 3 days vs the prior 14-day baseline. Status is demo-only.">Anomalies · {rows.length}</Title>
      {rows.length === 0 ? <p className="mt-5 rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">No active anomalies for the selected filters.</p> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="py-2 font-medium">Date</th><th className="py-2 font-medium">Service</th><th className="py-2 text-right font-medium">Expected</th><th className="py-2 text-right font-medium">Actual</th><th className="py-2 text-right font-medium">Deviation</th><th className="py-2 pl-3 font-medium">Probable cause</th><th className="py-2 font-medium">Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="cursor-pointer border-t border-border hover:bg-secondary/50" onClick={() => setOpen(r)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(r)}>
                <td className="py-3 pr-3 whitespace-nowrap">{r.date}</td>
                <td className="py-3 pr-3"><p className="font-medium">{r.provider} {r.service}</p><p className="text-xs text-muted-foreground">{r.resourceId}</p></td>
                <td className="metric-numbers py-3 text-right">{fmtUSD(r.expected)}</td>
                <td className="metric-numbers py-3 text-right">{fmtUSD(r.actual)}</td>
                <td className="metric-numbers py-3 text-right text-destructive">+{r.change}%</td>
                <td className="py-3 pl-3 text-xs text-muted-foreground">{r.cause}</td>
                <td className="py-3" onClick={(e) => e.stopPropagation()}>
                  <Select value={status[r.id] ?? "New"} onValueChange={(v) => setSession((s) => ({ ...s, anomalies: { ...s.anomalies, [r.id]: v as AnomalyStatus } }))}>
                    <SelectTrigger className="h-10 w-36 rounded-xl" aria-label={`Status for ${r.title}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{anomalyStatuses.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <AnomalyDrawer row={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function AnomalyDrawer({ row, onClose }: { row: AnomalyRowDto | null; onClose: () => void }) {
  const [table, setTable] = useState(false);
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {row && (<>
          <SheetHeader><SheetTitle>{row.title}</SheetTitle><SheetDescription>{row.date} · +{row.change}% · {fmtUSD(row.impact)}/mo impact</SheetDescription></SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">Expected band vs actual (21 days)</p><TableToggle on={table} onChange={setTable} /></div>
            <div className="h-64">
              {table ? <DataTableView caption="Daily actual vs expected band" columns={["Day", "Actual", "Expected low", "Expected high"]} rows={row.series.map((p) => [p.day, fmtUSD(p.actual), fmtUSD(p.low), fmtUSD(p.high)])} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={row.series.map((p) => ({ ...p, band: [p.low, p.high] }))} margin={{ left: 0, right: 8, top: 4 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis width={52} tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tip} formatter={(v) => (Array.isArray(v) ? `${fmtUSD(Number(v[0]))} – ${fmtUSD(Number(v[1]))}` : fmtUSD(Number(v)))} />
                    <Area dataKey="band" name="Expected band" stroke="none" fill="var(--chart-2)" fillOpacity={0.25} />
                    <Line dataKey="actual" name="Actual" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary p-3"><dt className="text-xs text-muted-foreground">Expected (3 days)</dt><dd className="metric-numbers mt-1">{fmtUSD(row.expected)}</dd></div>
              <div className="rounded-xl bg-destructive-soft p-3"><dt className="text-xs text-muted-foreground">Actual (3 days)</dt><dd className="metric-numbers mt-1 text-destructive">{fmtUSD(row.actual)}</dd></div>
            </dl>
            <p className="text-sm"><span className="font-medium">Probable cause:</span> {row.cause}</p>
          </div>
        </>)}
      </SheetContent>
    </Sheet>
  );
}
