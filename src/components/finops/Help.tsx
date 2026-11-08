import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { GLOSSARY, metricTerm, type GlossaryTerm } from "@/lib/glossary";
import { fuzzyMatch } from "@/lib/findability";
import { SHORTCUTS } from "@/lib/shortcuts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

function CalculationLink({ term, onClick }: { term: GlossaryTerm; onClick?: () => void }) {
  return <Button variant="link" className="h-auto whitespace-normal p-0 text-left" asChild><Link to={term.to} search={(p: Record<string, unknown>) => ({ ...p, tab: term.tab })} hash={term.anchor} onClick={onClick}>How it is calculated</Link></Button>;
}
export function MetricInfo({ label }: { label: string }) {
  const term = metricTerm(label);
  if (!term) return null;
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={`About ${label}`} onClick={(e) => { e.stopPropagation(); }}><Info className="size-3.5" /></Button></PopoverTrigger><PopoverContent className="w-72 space-y-3" onClick={(e) => e.stopPropagation()}><p className="text-sm font-medium">{term.name}</p><p className="text-sm text-muted-foreground">{term.definition}</p><CalculationLink term={term} /></PopoverContent></Popover>;
}
export function HelpDrawer({ open, onOpenChange, returnFocus }: { open: boolean; onOpenChange: (v: boolean) => void; returnFocus: () => void }) {
  const [search, setSearch] = useState("");
  const terms = GLOSSARY.filter((t) => fuzzyMatch(`${t.name} ${t.definition}`, search));
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full sm:max-w-lg" onCloseAutoFocus={(e) => { e.preventDefault(); returnFocus(); }}><SheetHeader><SheetTitle>Help</SheetTitle><SheetDescription>Glossary and keyboard shortcuts</SheetDescription></SheetHeader><Input className="my-4" aria-label="Search glossary" placeholder="Search terms…" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="space-y-5">{terms.map((t) => <section key={t.id} className="space-y-1.5"><h3 className="text-sm font-medium">{t.name}</h3><p className="text-sm text-muted-foreground">{t.definition}</p><CalculationLink term={t} onClick={() => onOpenChange(false)} /></section>)}{!terms.length && <div className="space-y-2"><p className="text-sm text-muted-foreground">No glossary terms match this search.</p><Button variant="secondary" onClick={() => setSearch("")}>Clear search</Button></div>}<section className="border-t border-border pt-4"><h3 className="mb-3 text-sm font-medium">Keyboard shortcuts</h3>{SHORTCUTS.map((s) => <p key={s.keys} className="flex justify-between gap-4 py-1 text-sm"><span className="text-muted-foreground">{s.action}</span><kbd>{s.keys}</kbd></p>)}</section></div></SheetContent></Sheet>;
}
/** Formula destinations use existing tabs without adding URL parameters or pages. */
export function CalculationNotes() {
  const location = useRouterState({ select: (s) => s.location });
  const tab = (location.search as { tab?: string }).tab;
  const terms = GLOSSARY.filter((t) => t.anchor && t.to === location.pathname && (tab === t.tab || !tab && t.tab === "explore"));
  const unique = terms.filter((t, i) => terms.findIndex((x) => x.anchor === t.anchor) === i);
  return <>{unique.map((t) => <section key={t.anchor} id={t.anchor} className="scroll-mt-40 border-t border-border pt-4"><h2 className="text-sm font-medium">How it is calculated · {t.name}</h2><p className="mt-2 text-sm text-muted-foreground">{t.definition}</p></section>)}</>;
}