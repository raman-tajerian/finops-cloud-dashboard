import { SlidersHorizontal, X } from "lucide-react";
import { rangeLabels } from "@/lib/finops-platform-data";
import { allProviders, defaultFilters, isDefault, useGlobalFilters, type Filters } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterBar } from "./Platform";

/** URL-backed global filters: full bar on desktop, bottom sheet on mobile, plus removable chips. */
export function GlobalFilters() {
  const { filters, setFilters, reset } = useGlobalFilters();
  const chips: { label: string; remove: () => void }[] = [];
  if (filters.range !== defaultFilters.range) chips.push({ label: rangeLabels[filters.range], remove: () => setFilters({ ...filters, range: "mtd" }) });
  if (filters.providers.length < allProviders.length) filters.providers.forEach((p) => chips.push({ label: p, remove: () => setFilters({ ...filters, providers: filters.providers.length > 1 ? filters.providers.filter((x) => x !== p) : allProviders }) }));
  if (filters.env !== "All") chips.push({ label: filters.env, remove: () => setFilters({ ...filters, env: "All" }) });
  if (filters.team !== "All") chips.push({ label: `Team: ${filters.team}`, remove: () => setFilters({ ...filters, team: "All" }) });
  const onChange = (f: Filters) => setFilters(f);

  return (
    <div className="space-y-3">
      <div className="hidden md:block"><FilterBar filters={filters} onChange={onChange} /></div>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild><Button variant="secondary" className="h-10 w-full justify-start rounded-xl"><SlidersHorizontal />Filters{chips.length > 0 && <span className="ml-auto rounded-full bg-accent px-2 text-xs">{chips.length}</span>}</Button></SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader><SheetTitle>Filters</SheetTitle><SheetDescription>Applies to every page and is saved in the link.</SheetDescription></SheetHeader>
            <div className="px-4 pb-6 [&_.organic-card]:border-0 [&_.organic-card]:bg-transparent [&_.organic-card]:p-0"><FilterBar filters={filters} onChange={onChange} /></div>
          </SheetContent>
        </Sheet>
      </div>
      {!isDefault(filters) && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <button key={c.label} onClick={c.remove} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs hover:border-input" aria-label={`Remove filter ${c.label}`}>
              {c.label}<X className="size-3" />
            </button>
          ))}
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={reset}>Reset all</Button>
        </div>
      )}
    </div>
  );
}
