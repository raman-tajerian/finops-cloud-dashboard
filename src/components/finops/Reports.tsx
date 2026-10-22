import { useState } from "react";
import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useGlobalFilters } from "@/lib/filters";
import { setSession, useSession, type ScheduleRow } from "@/lib/session-store";
import { REPORT_TEMPLATES, reportToCsv, reportToJson } from "@/data/reports";
import { fmtDemoDate, DEMO_TODAY } from "@/data/resources";
import { isEmail, parseEmails } from "@/lib/validators";
import type { ReportDto, ReportFormat, ReportTemplateId } from "@/types/finops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, SectionHeading } from "./States";

export const Demo = () => <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Demo</span>;
const RANGES = [["7d", "Last 7 days"], ["mtd", "Month to date"], ["q3", "Quarter"]] as const;
const FORMATS: ReportFormat[] = ["PDF", "CSV", "JSON"];
const tplName = (id: string) => REPORT_TEMPLATES.find((t) => t.id === id)?.name ?? id;

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
async function printReport(r: ReportDto) {
  const { openPrintView } = await import("./reportPrint"); // lazy: never in the main bundle
  openPrintView(r);
}
function deliver(r: ReportDto, format: string, content: string) {
  const slug = `${r.template}-${r.range}-${r.generatedAt}`;
  if (format === "CSV") download(`${slug}.csv`, content, "text/csv");
  else if (format === "JSON") download(`${slug}.json`, content, "application/json");
  else void printReport(JSON.parse(content) as ReportDto);
}

export function ReportsWorkspace() {
  const { filters } = useGlobalFilters();
  const reports = useSession((s) => s.reports);
  const schedules = useSession((s) => s.schedules);
  const [gen, setGen] = useState<ReportTemplateId | null>(null);
  const [range, setRange] = useState<string>(filters.range);
  const [format, setFormat] = useState<ReportFormat>("CSV");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState<{ kind: "report" | "schedule"; id: string } | null>(null);
  const [sched, setSched] = useState(false);

  const open = (id: ReportTemplateId) => { setGen(id); setRange(filters.range); setErr(null); };
  async function generate() {
    if (!gen) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.getReport({ ...filters, range: range as typeof filters.range }, gen);
      const content = format === "CSV" ? reportToCsv(r) : reportToJson(r);
      setSession((s) => ({ ...s, reports: [{ id: `rep-${s.reports.length + 1}-${Date.now()}`, template: gen, title: r.title, format, range: r.range, created: r.generatedAt, content }, ...s.reports] }));
      deliver(r, format, content);
      toast.success(`${r.title} generated (${format})`);
      setGen(null);
    } catch { setErr("We couldn't build this report. Try again."); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading title="Templates" description="Built from the same numbers as Overview, Cost Explorer, Recommendations and Security, using the active filters." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {REPORT_TEMPLATES.map((t) => (
            <article key={t.id} className="organic-card flex flex-col gap-3 p-5">
              <FileText className="size-5 text-primary" aria-hidden />
              <div><h3 className="font-semibold">{t.name}</h3><p className="text-sm text-muted-foreground">{t.description}</p></div>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{t.sections.map((s) => <li key={s}>{s}</li>)}</ul>
              <Button className="mt-auto" onClick={() => open(t.id)}>Generate report</Button>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2"><SectionHeading title="Past reports" description="Generated this session only." /><Demo /></div>
        {reports.length === 0 ? <EmptyState icon={FileText} title="No reports yet. Generate one from a template above." action="Generate executive summary" onAction={() => open("executive")} /> : (
          <div className="organic-card overflow-x-auto"><table className="density-table w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Report</th><th className="px-4 py-3 font-medium">Range</th><th className="px-4 py-3 font-medium">Format</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3" /></tr></thead>
            <tbody>{reports.map((r) => (
              <tr key={r.id} className="border-t border-border"><td className="px-4 py-3 font-medium">{r.title}</td><td className="px-4 py-3">{r.range}</td><td className="px-4 py-3">{r.format}</td><td className="px-4 py-3">{fmtDemoDate(r.created)}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" aria-label={`Download ${r.title}`} onClick={() => deliver(r.format === "PDF" ? (JSON.parse(r.content) as ReportDto) : ({ template: r.template, range: r.range, generatedAt: r.created } as ReportDto), r.format, r.content)}><Download className="size-4" /></Button><Button size="sm" variant="ghost" aria-label={`Delete ${r.title}`} onClick={() => setDel({ kind: "report", id: r.id })}><Trash2 className="size-4" /></Button></td></tr>
            ))}</tbody></table></div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><SectionHeading title="Scheduled reports" description="Nothing is actually sent." /><Demo /></div><Button variant="secondary" onClick={() => setSched(true)}>New schedule</Button></div>
        {schedules.length === 0 ? <EmptyState icon={FileText} title="No schedules yet." action="Create schedule" onAction={() => setSched(true)} /> : (
          <div className="organic-card overflow-x-auto"><table className="density-table w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Template</th><th className="px-4 py-3 font-medium">Cadence</th><th className="px-4 py-3 font-medium">Recipients</th><th className="px-4 py-3 font-medium">Format</th><th className="px-4 py-3 font-medium">On</th><th className="px-4 py-3" /></tr></thead>
            <tbody>{schedules.map((s) => (
              <tr key={s.id} className="border-t border-border"><td className="px-4 py-3 font-medium">{tplName(s.template)}</td><td className="px-4 py-3 capitalize">{s.cadence}</td><td className="max-w-[220px] truncate px-4 py-3">{s.recipients.join(", ")}</td><td className="px-4 py-3">{s.format}</td>
                <td className="px-4 py-3"><Switch checked={s.enabled} aria-label="Toggle schedule" onCheckedChange={(v) => setSession((st) => ({ ...st, schedules: st.schedules.map((x) => x.id === s.id ? { ...x, enabled: v } : x) }))} /></td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" aria-label="Delete schedule" onClick={() => setDel({ kind: "schedule", id: s.id })}><Trash2 className="size-4" /></Button></td></tr>
            ))}</tbody></table></div>
        )}
      </section>

      <Dialog open={!!gen} onOpenChange={(o) => !o && !busy && setGen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate {gen ? tplName(gen) : ""}</DialogTitle><DialogDescription>Uses the active provider, environment and team filters.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5"><Label>Date range</Label><Select value={range} onValueChange={setRange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RANGES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Format</Label><div className="flex gap-2">{FORMATS.map((f) => <Button key={f} type="button" variant={format === f ? "default" : "secondary"} aria-pressed={format === f} onClick={() => setFormat(f)}>{f}</Button>)}</div>{format === "PDF" && <p className="text-xs text-muted-foreground">Opens a print-friendly view; choose "Save as PDF".</p>}</div>
            {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          </div>
          <DialogFooter><Button variant="secondary" disabled={busy} onClick={() => setGen(null)}>Cancel</Button><Button disabled={busy} onClick={generate}>{busy ? <><Loader2 className="size-4 animate-spin" />Building report…</> : "Generate"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ScheduleDialog open={sched} onClose={() => setSched(false)} />

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this {del?.kind}?</AlertDialogTitle><AlertDialogDescription>This removes it from this demo session.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (!del) return; setSession((s) => del.kind === "report" ? { ...s, reports: s.reports.filter((x) => x.id !== del.id) } : { ...s, schedules: s.schedules.filter((x) => x.id !== del.id) }); toast.success("Deleted"); setDel(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScheduleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [template, setTemplate] = useState<ReportTemplateId>("executive");
  const [cadence, setCadence] = useState<ScheduleRow["cadence"]>("weekly");
  const [format, setFormat] = useState<ReportFormat>("PDF");
  const [recipients, setRecipients] = useState("");
  const [error, setError] = useState<string | null>(null);
  function save() {
    const list = parseEmails(recipients);
    const bad = list.filter((e) => !isEmail(e));
    if (!list.length) return setError("Add at least one recipient.");
    if (bad.length) return setError(`Invalid email: ${bad.join(", ")}`);
    setSession((s) => ({ ...s, schedules: [...s.schedules, { id: `sch-${DEMO_TODAY.getTime()}-${s.schedules.length + 1}`, template, cadence, recipients: list, format, enabled: true }] }));
    toast.success("Schedule created (demo, nothing is sent)");
    setRecipients(""); setError(null); onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New scheduled report</DialogTitle><DialogDescription>Demo only — no email is sent.</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label>Template</Label><Select value={template} onValueChange={(v) => setTemplate(v as ReportTemplateId)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REPORT_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Cadence</Label><Select value={cadence} onValueChange={(v) => setCadence(v as ScheduleRow["cadence"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Format</Label><Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="sch-rcp">Recipients</Label><Input id="sch-rcp" placeholder="name@company.com, other@company.com" value={recipients} aria-invalid={!!error} onChange={(e) => { setRecipients(e.target.value); setError(null); }} />{error && <p className="text-xs text-destructive">{error}</p>}</div>
        </div>
        <DialogFooter><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Create schedule</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
