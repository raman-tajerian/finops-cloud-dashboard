import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownUp, Check, Copy, ExternalLink, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { complianceResult, isOpenFinding, SEVERITY_ORDER, securityScore, RULE_META } from "@/data/security";
import type { FindingStatus, SecurityDto, SecurityFindingDto, Severity } from "@/types/finops";
import { useSecurity } from "@/lib/queries";
import { setSession, useSession, type FindingSessionStatus } from "@/lib/session-store";
import { CardBoundary, CardSkeleton, DataTableView, EmptyState, ErrorState, SectionHeading, StatusBadge, TableToggle } from "@/components/finops/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export interface SecSearch { sev: string; fstatus: string; prov: string; rule: string; q: string; sort: string; finding: string }

const sevTone: Record<Severity, "critical" | "warning" | "idle" | "success"> = { Critical: "critical", High: "warning", Medium: "idle", Low: "success" };
const statusTone: Record<FindingStatus, "critical" | "warning" | "success" | "idle"> = { Open: "critical", "In progress": "warning", Resolved: "success", "Accepted risk": "idle" };
const RULE_LABELS: Record<string, string> = Object.fromEntries(Object.entries(RULE_META).map(([k, v]) => [k, v.title]));

/** Gate like DataGate, but for the security query. */
function SecGate({ children, h }: { children: (d: SecurityDto) => ReactNode; h?: string }) {
  const q = useSecurity();
  if (q.isPending) return <CardSkeleton h={h ?? "h-40"} />;
  if (q.isError) return <ErrorState message="We couldn't load this data. Check your connection and try again." onRetry={() => q.refetch()} />;
  return <CardBoundary onReset={() => q.refetch()}>{children(q.data!)}</CardBoundary>;
}

function useDebounced(value: string, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function SecurityWorkspace({ search, setSearch }: { search: SecSearch; setSearch: (p: Partial<SecSearch>) => void }) {
  const session = useSession((s) => s.findings);
  return (
    <div className="space-y-6">
      <div className="organic-card flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <p>Findings on this page are <span className="font-medium text-foreground">simulated</span> — derived deterministically from the demo dataset. No real scanning takes place. Status changes last for this session only (Demo).</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <SecGate h="h-48">{({ scoreTrend }) => <ScoreCard trend={scoreTrend} />}</SecGate>
        <SecGate h="h-48">{({ findings, frameworks }) => <ComplianceCards findings={withStatus(findings, session)} frameworks={frameworks} />}</SecGate>
      </div>
      <SecGate h="h-72">{({ findings }) => <FindingsTable findings={withStatus(findings, session)} search={search} setSearch={setSearch} />}</SecGate>
      <SecGate h="h-24">{({ findings }) => <FindingDrawer finding={withStatus(findings, session).find((x) => x.id === search.finding) ?? null} onClose={() => setSearch({ finding: "" })} />}</SecGate>
    </div>
  );
}

/** Overlay session statuses on the fetched findings. */
function withStatus(findings: SecurityFindingDto[], session: Record<string, { status: FindingSessionStatus }>): SecurityFindingDto[] {
  return findings.map((f) => (session[f.id] ? { ...f, status: session[f.id]!.status } : f));
}

function setFindingStatus(id: string, status: FindingSessionStatus, reason?: string) {
  setSession((s) => ({ ...s, findings: { ...s.findings, [id]: { status, ...(reason ? { reason } : {}) } } }));
}

/* ---------- Score ring + 6-month trend ---------- */
function ScoreCard({ trend }: { trend: SecurityDto["scoreTrend"] }) {
  const session = useSession((s) => s.findings);
  const q = useSecurity();
  const findings = withStatus(q.data?.findings ?? [], session);
  const score = securityScore(findings);
  const [asTable, setAsTable] = useState(false);
  const R = 52, C = 2 * Math.PI * R;
  return (
    <article className="organic-card h-full p-6">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-mono text-[10px] text-muted-foreground">Security score</p><p className="mt-1 text-[13px] text-muted-foreground">100 − weighted open findings (Critical 8 · High 4 · Medium 1.5 · Low 0.5), clamped at 0.</p></div>
        <TableToggle on={asTable} onChange={setAsTable} />
      </div>
      <div className="mt-4 flex items-center gap-6">
        <svg viewBox="0 0 120 120" className="size-28 shrink-0" role="img" aria-label={`Security score ${score} of 100`}>
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-secondary" />
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-700" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} transform="rotate(-90 60 60)" />
          <text x="60" y="66" textAnchor="middle" className="fill-foreground font-display text-2xl">{score}</text>
        </svg>
        <div className="min-w-0 flex-1">
          {asTable ? (
            <DataTableView caption="Security score trend, last 6 months" columns={["Month", "Score"]} rows={trend.map((t) => [t.month, t.score])} />
          ) : (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}`, "Score"]} cursor={{ fill: "var(--secondary)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>{trend.map((t, i) => <Cell key={t.month} fill={i === trend.length - 1 ? "var(--primary)" : "var(--chart-2)"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">6-month trend · history is seeded demo data (Demo); the current month is the computed score.</p>
        </div>
      </div>
    </article>
  );
}

/* ---------- Compliance framework cards ---------- */
function ComplianceCards({ findings, frameworks }: { findings: SecurityFindingDto[]; frameworks: SecurityDto["frameworks"] }) {
  const [open, setOpen] = useState<string | null>(null);
  const results = frameworks.map((fw) => ({ fw, r: complianceResult(fw, findings) }));
  const active = results.find((x) => x.fw.id === open);
  return (
    <article className="organic-card h-full p-6">
      <SectionHeading title="Compliance posture · Illustrative" description="Illustrative: these controls are simplified examples, not an audit. A control fails when an open finding of a mapped rule exists. Click a card to inspect its controls." />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {results.map(({ fw, r }) => (
          <button key={fw.id} onClick={() => setOpen(open === fw.id ? null : fw.id)} aria-expanded={open === fw.id} className={`rounded-xl border p-4 text-left transition-colors ${open === fw.id ? "border-foreground/40 bg-secondary" : "border-border hover:bg-secondary/50"}`}>
            <p className="text-sm font-semibold">{fw.name}</p>
            <p className="metric-numbers mt-1 text-xs text-muted-foreground"><span className="text-success">{r.passed} pass</span> · <span className={r.failed ? "text-destructive" : ""}>{r.failed} fail</span> of {r.total}</p>
            <Progress value={(r.passed / r.total) * 100} className="mt-3 h-1.5" />
          </button>
        ))}
      </div>
      {active && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{active.fw.name} controls</caption>
            <thead className="bg-secondary/60 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-2 font-medium">Control</th><th scope="col" className="w-20 px-4 py-2 font-medium">Result</th><th scope="col" className="px-4 py-2 font-medium">Open findings behind a failure</th></tr></thead>
            <tbody>
              {active.r.controls.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{c.id}</span> · {c.name}</td>
                  <td className="px-4 py-2">{c.passed ? <StatusBadge tone="success">Pass</StatusBadge> : <StatusBadge tone="critical">Fail</StatusBadge>}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{c.passed ? "—" : c.findings.map((f) => f.title).join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

/* ---------- Findings table ---------- */
function FindingsTable({ findings, search, setSearch }: { findings: SecurityFindingDto[]; search: SecSearch; setSearch: (p: Partial<SecSearch>) => void }) {
  const [qInput, setQInput] = useState(search.q);
  const q = useDebounced(qInput);
  useEffect(() => { if (q !== search.q) setSearch({ q }); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    let xs = findings;
    if (search.sev !== "All") xs = xs.filter((x) => x.severity === search.sev);
    if (search.fstatus !== "All") xs = xs.filter((x) => x.status === search.fstatus);
    if (search.prov !== "All") xs = xs.filter((x) => x.provider === search.prov);
    if (search.rule !== "All") xs = xs.filter((x) => x.rule === search.rule);
    const needle = search.q.trim().toLowerCase();
    if (needle) xs = xs.filter((x) => `${x.title} ${x.provider} ${x.resourceId ?? ""}`.toLowerCase().includes(needle));
    const sevRank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
    const sorted = [...xs];
    switch (search.sort) {
      case "sev-asc": sorted.sort((a, b) => sevRank(a.severity) - sevRank(b.severity)); break;
      case "sev-desc": sorted.sort((a, b) => sevRank(b.severity) - sevRank(a.severity)); break;
      case "date-asc": sorted.sort((a, b) => a.detected.localeCompare(b.detected)); break;
      case "date-desc": sorted.sort((a, b) => b.detected.localeCompare(a.detected)); break;
      default: sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [findings, search]);

  const counts = useMemo(() => {
    const m = new Map<Severity, number>();
    for (const f of findings) if (isOpenFinding(f.status)) m.set(f.severity, (m.get(f.severity) ?? 0) + 1);
    return m;
  }, [findings]);

  const filterSelect = (label: string, value: string, onChange: (v: string) => void, options: string[]) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full min-w-0 sm:w-36" aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o === "All" ? `${label}: all` : (RULE_LABELS[o] ?? o)}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <article className="organic-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading title="Findings" description={`${findings.length} findings for the active filters · ${[...counts].map(([s, n]) => `${n} ${s}`).join(" · ") || "none open"}`} />
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search findings…" className="h-9 pl-8" aria-label="Search findings" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filterSelect("Severity", search.sev, (v) => setSearch({ sev: v }), ["All", ...SEVERITY_ORDER])}
        {filterSelect("Status", search.fstatus, (v) => setSearch({ fstatus: v }), ["All", "Open", "In progress", "Resolved", "Accepted risk"])}
        {filterSelect("Provider", search.prov, (v) => setSearch({ prov: v }), ["All", "AWS", "Azure", "GCP"])}
        {filterSelect("Rule", search.rule, (v) => setSearch({ rule: v }), ["All", ...Object.keys(RULE_META)])}
        <Select value={search.sort} onValueChange={(v) => setSearch({ sort: v })}>
          <SelectTrigger className="h-9 w-full min-w-0 sm:w-44" aria-label="Sort"><ArrowDownUp className="size-3.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sev-asc">Severity (Critical first)</SelectItem>
            <SelectItem value="sev-desc">Severity (Low first)</SelectItem>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState icon={ShieldCheck} title="No findings match the current filters. Try widening the filters or resetting the search." action="Clear filters" onAction={() => { setQInput(""); setSearch({ sev: "All", fstatus: "All", prov: "All", rule: "All", q: "" }); }} /></div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Security findings</caption>
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr><th scope="col" className="px-4 py-2 font-medium">Severity</th><th scope="col" className="px-4 py-2 font-medium">Finding</th><th scope="col" className="px-4 py-2 font-medium">Provider</th><th scope="col" className="px-4 py-2 font-medium">First detected</th><th scope="col" className="px-4 py-2 font-medium">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} onClick={() => setSearch({ finding: f.id })} className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/40">
                  <td className="px-4 py-2.5"><StatusBadge tone={sevTone[f.severity]}>{f.severity}</StatusBadge></td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 font-medium">{f.title}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.provider}{f.resourceId ? ` · ${f.resourceId}` : " · account"}</td>
                  <td className="metric-numbers px-4 py-2.5 text-muted-foreground">{f.detected}</td>
                  <td className="px-4 py-2.5"><StatusBadge tone={statusTone[f.status]}>{f.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

/* ---------- Finding drawer ---------- */
function FindingDrawer({ finding, onClose }: { finding: SecurityFindingDto | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [reason, setReason] = useState("");
  const copy = async () => {
    if (!finding) return;
    try { await navigator.clipboard.writeText(finding.snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };
  const act = (status: FindingSessionStatus, r?: string) => { if (finding) setFindingStatus(finding.id, status, r); };
  return (
    <Sheet open={!!finding} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {finding && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={sevTone[finding.severity]}>{finding.severity}</StatusBadge><StatusBadge tone={statusTone[finding.status]}>{finding.status}</StatusBadge><span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Demo</span></div>
              <SheetTitle className="text-left">{finding.title}</SheetTitle>
              <SheetDescription className="text-left">{finding.provider}{finding.resourceId ? ` · ${finding.resourceId}` : " · account level"} · first detected {finding.detected}</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <section><h3 className="text-sm font-semibold">Description</h3><p className="mt-1 text-sm text-muted-foreground">{finding.description}</p></section>
              <section><h3 className="text-sm font-semibold">Impact</h3><p className="mt-1 text-sm text-muted-foreground">{finding.impact}</p></section>
              <section>
                <h3 className="text-sm font-semibold">Remediation</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">{finding.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                <div className="relative mt-3">
                  <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/50 p-3 font-mono text-xs leading-relaxed">{finding.snippet}</pre>
                  <Button size="sm" variant="secondary" className="absolute right-2 top-2 h-7 text-xs" onClick={copy}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}</Button>
                </div>
              </section>
              {finding.resourceId && (
                <Button variant="secondary" asChild><Link to="/resources" search={{ ids: finding.resourceId } as never}><ExternalLink />View resource on Resources</Link></Button>
              )}
              <section>
                <h3 className="text-sm font-semibold">Actions <span className="font-normal text-muted-foreground">(session only · Demo)</span></h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" disabled={finding.status === "In progress"} onClick={() => act("In progress")}>Mark in progress</Button>
                  <Button size="sm" disabled={finding.status === "Resolved"} onClick={() => act("Resolved")}>Resolve</Button>
                  <Button size="sm" variant="secondary" disabled={finding.status === "Accepted risk"} onClick={() => { setReason(""); setAcceptOpen(true); }}>Accept risk</Button>
                  {finding.status !== "Open" && <Button size="sm" variant="ghost" onClick={() => act("Open")}>Reopen</Button>}
                </div>
              </section>
            </div>
            <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Accept risk</DialogTitle><DialogDescription>Document why this finding is an accepted risk. Session only — nothing really changes (Demo).</DialogDescription></DialogHeader>
                <Textarea rows={3} maxLength={300} placeholder="Reason, e.g. 'legacy batch host, decommissioned in Q1'" value={reason} onChange={(e) => setReason(e.target.value)} />
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setAcceptOpen(false)}>Cancel</Button>
                  <Button disabled={!reason.trim()} onClick={() => { act("Accepted risk", reason.trim()); setAcceptOpen(false); }}>Accept risk</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
