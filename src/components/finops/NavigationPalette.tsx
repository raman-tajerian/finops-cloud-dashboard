import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fuzzyMatch, searchTargets, type SearchTarget } from "@/lib/findability";
import { useDashboard, useSecurity } from "@/lib/queries";
import { CURRENCIES, useSetCurrency } from "@/lib/money";
import { useGlobalFilters } from "@/lib/filters";
import { recordSearch, setSession, useSession } from "@/lib/session-store";
import { api } from "@/lib/api";
import { reportToCsv } from "@/data/reports";

export function NavigationPalette({ open, onOpenChange, returnFocus, createBudget, openHelp, scan }: { open: boolean; onOpenChange: (v: boolean) => void; returnFocus: () => void; createBudget: () => void; openHelp: () => void; scan: () => void }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const dashboard = useDashboard(); const security = useSecurity();
  const navigate = useNavigate(); const setCurrency = useSetCurrency();
  const { filters, reset } = useGlobalFilters();
  const searches = useSession((s) => s.navigation.searches);
  const recs = useSession((s) => s.recs);
  const remember = () => setSession((s) => ({ ...s, navigation: recordSearch(s.navigation, query) }));
  const run = (fn: () => void) => { remember(); onOpenChange(false); fn(); };
  const go = (t: SearchTarget) => run(() => navigate({ to: t.to, search: (p: Record<string, unknown>) => ({ range: p.range, providers: p.providers, env: p.env, team: p.team, cur: p.cur, tab: t.tab ?? "", ...t.search }) } as never));
  const targets = searchTargets(dashboard.data, security.data).map((t) => {
    if (t.group !== "Recommendations") return t;
    const rec = dashboard.data?.recommendations.find((r) => r.title === t.label);
    const status = rec ? recs[rec.id]?.status ?? "Open" : "Open";
    return { ...t, tab: status === "Open" ? "open" : status === "In progress" ? "in-progress" : "done", search: rec ? { cat: rec.category, effort: "All", risk: "All", status: "All" } : {} };
  }).filter((t) => fuzzyMatch(`${t.label} ${t.keywords ?? ""}`, query));
  const exportCsv = async () => {
    setBusy(true);
    try {
      const report = await api.getReport(filters, "executive");
      const url = URL.createObjectURL(new Blob([reportToCsv(report)], { type: "text/csv" }));
      const a = document.createElement("a"); a.href = url; a.download = `fern-${report.range}.csv`; a.click(); URL.revokeObjectURL(url);
      run(() => toast.success("CSV exported for the active filters"));
    } catch { toast.error("Could not export the report. Try again."); } finally { setBusy(false); }
  };
  const actions = [
    ...CURRENCIES.map((c) => ({ label: `Change currency to ${c}`, fn: () => run(() => setCurrency(c)) })),
    { label: "Toggle Reduce motion", fn: () => run(() => setSession((s) => ({ ...s, settings: { ...s.settings, reduceMotion: !s.settings.reduceMotion } }))) },
    { label: "Reset filters", fn: () => run(reset) }, { label: "Create budget", fn: () => run(createBudget) },
    { label: "Export CSV", fn: () => { remember(); void exportCsv(); } },
    { label: "Help and keyboard shortcuts", fn: () => run(openHelp) }, { label: "Run full scan", fn: () => run(scan) },
  ].filter((a) => fuzzyMatch(a.label, query));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl overflow-hidden p-0" onCloseAutoFocus={(e) => { e.preventDefault(); returnFocus(); }}><DialogTitle className="sr-only">Search Fern</DialogTitle><DialogDescription className="sr-only">Find pages, tabs, resources and actions.</DialogDescription><Command shouldFilter={false}><CommandInput aria-label="Search Fern" value={query} onValueChange={setQuery} placeholder="Search pages, resources, terms or actions…" /><CommandList className="max-h-[60dvh]">
    {!query && searches.length > 0 && <CommandGroup heading="Recent searches">{searches.map((s) => <CommandItem key={s} value={`recent:${s}`} onSelect={() => setQuery(s)}>{s}</CommandItem>)}</CommandGroup>}
    {["Pages", "Tabs", "Resources", "Recommendations", "Findings", "Settings"].map((group) => { const rows = targets.filter((t) => t.group === group); return rows.length > 0 && <CommandGroup key={group} heading={group}>{rows.map((t, i) => <CommandItem key={`${group}:${t.to}:${i}`} value={`${group}:${t.to}:${i}`} onSelect={() => go(t)}><span className="min-w-0 flex-1 break-words">{t.label}</span></CommandItem>)}</CommandGroup>; })}
    {actions.length > 0 && <CommandGroup heading="Actions">{actions.map((a) => <CommandItem key={a.label} value={a.label} disabled={busy && a.label === "Export CSV"} onSelect={a.fn}>{a.label}{busy && a.label === "Export CSV" && "…"}</CommandItem>)}</CommandGroup>}
    {!targets.length && !actions.length && <div className="space-y-3 p-6 text-center"><p className="text-sm text-muted-foreground">Nothing matches this search in the selected filters.</p><Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button></div>}
  </CommandList><div className="flex flex-wrap gap-4 border-t border-border p-3 text-xs text-muted-foreground"><span>↑ ↓ Navigate</span><span>↵ Open</span><span>Esc Close</span></div></Command></DialogContent></Dialog>;
}