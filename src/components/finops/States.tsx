import { Link } from "@tanstack/react-router";
import { Component, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTableDensity } from "@/lib/density";
import { useGlobalFilters } from "@/lib/filters";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 py-2">
      <div className="min-w-0"><h1 className="font-display text-[38px] font-normal leading-[1.15] tracking-normal">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>
      {actions}
    </div>
  );
}

/** A quiet, data-led opening for each page's first tab. Numbers stay in Geist. */
export function PageHero({ label, value, change, description }: { label: string; value: ReactNode; change?: ReactNode; description: string }) {
  return (
    <section aria-label={label} className="relative isolate overflow-hidden rounded-3xl bg-hero px-7 py-8 md:px-8">
      <svg aria-hidden viewBox="0 0 176 104" className="pointer-events-none absolute -right-1 -top-1 hidden h-full w-44 opacity-60 sm:block">
        <path d="M0 104V16a88 88 0 0 1 88 88Z" className="fill-brand-burgundy" />
        <circle cx="116" cy="30" r="24" className="fill-brand-mustard" />
        <rect x="116" y="58" width="52" height="42" rx="16" className="fill-brand-sand" />
      </svg>
      <div className="relative max-w-3xl">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="metric-numbers text-[48px] leading-none tracking-[-0.035em]">{value}</p>
          {change && <div className="text-sm font-medium text-foreground">{change}</div>}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}

export function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-base font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>;
}

type Tone = "success" | "warning" | "critical" | "idle";
const tones: Record<Tone, { c: string; icon: LucideIcon }> = {
  success: { c: "bg-success-soft text-success", icon: CheckCircle2 },
  warning: { c: "bg-warning-soft text-warning", icon: TriangleAlert },
  critical: { c: "bg-destructive-soft text-destructive", icon: OctagonAlert },
  idle: { c: "bg-secondary text-muted-foreground", icon: CircleDashed },
};
export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const { c, icon: I } = tones[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c}`}><I className="size-3" aria-hidden />{children}</span>;
}

export function EmptyState({ title, action, onAction }: { icon: LucideIcon; title: string; action: string; onAction: () => void }) {
  return (
    <div className="organic-card grid place-items-center gap-5 p-7 py-10 text-center">
      <svg aria-hidden viewBox="0 0 112 72" className="h-[72px] w-28">
        <path d="M4 68V20a48 48 0 0 1 48 48Z" className="fill-brand-burgundy" />
        <circle cx="70" cy="24" r="17" className="fill-brand-mustard" />
        <rect x="59" y="43" width="47" height="25" rx="10" className="fill-brand-sand" />
      </svg>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">{title}</p>
      <Button onClick={onAction}>{action}</Button>
    </div>
  );
}

export function FilterEmptyState() {
  const { reset } = useGlobalFilters();
  return <EmptyState icon={CircleDashed} title="No resources match these filters." action="Reset filters" onAction={reset} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="organic-card flex items-center gap-3 p-5">
      <AlertCircle className="size-5 shrink-0 text-destructive" />
      <p className="min-w-0 flex-1 text-sm">{message}</p>
      <Button variant="secondary" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export function CardSkeleton({ h = "h-40" }: { h?: string }) {
  return <div className="organic-card space-y-5 p-7"><Skeleton className="h-3 w-24 rounded-full" /><Skeleton className="h-9 w-36 rounded-xl" /><Skeleton className={`w-full rounded-2xl ${h}`} /></div>;
}

/** Toggle between a chart and an accessible table of the same data. */
export function TableToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" aria-pressed={on} onClick={() => onChange(!on)}>{on ? "View as chart" : "View as table"}</Button>;
}
export function DataTableView({ columns, rows, caption }: { columns: string[]; rows: (string | number)[][]; caption: string }) {
  const d = useTableDensity();
  return (
    <div className="h-full overflow-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-card text-xs text-muted-foreground"><tr>{columns.map((c) => <th key={c} scope="col" className={`px-4 ${d.pyHead} font-medium`}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((v, j) => <td key={j} className={`px-4 ${d.py} ${j ? "metric-numbers" : ""}`}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Progressive disclosure: show the first `n` rows with a "Show all" expander. */
export function useLimited<T>(rows: T[], n = 10) {
  const [all, setAll] = useState(false);
  return { shown: all ? rows : rows.slice(0, n), limited: !all && rows.length > n, total: rows.length, showAll: () => setAll(true) };
}

export function ShowAllButton({ total, onClick }: { total: number; onClick: () => void }) {
  return (
    <div className="flex justify-center border-t border-border p-3">
      <Button variant="ghost" size="sm" className="h-10 text-xs text-muted-foreground" onClick={onClick}>Show all {total} rows</Button>
    </div>
  );
}

/** Placeholder for pages still being built, with a way back to Overview. */
export function ComingSoon({ icon: I, what }: { icon: LucideIcon; what: string }) {
  return (
    <div className="organic-card grid place-items-center gap-3 p-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-secondary"><I className="size-5 text-muted-foreground" /></span>
      <p className="text-base font-medium">{what} is coming soon</p>
      <p className="max-w-sm text-sm text-muted-foreground">This page is being built. In the meantime, everything you need is on Overview.</p>
      <Button asChild><Link to="/">Back to Overview</Link></Button>
    </div>
  );
}

/** Isolates one card: a render error shows the error card with Retry instead of breaking the page. */
export class CardBoundary extends Component<{ children: ReactNode; onReset?: () => void; label?: string }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  override componentDidCatch(error: Error) { console.error(`[${this.props.label ?? "card"}]`, error); }
  reset = () => { this.props.onReset?.(); this.setState({ error: null }); };
  override render() {
    if (this.state.error) return <ErrorState message={`${this.props.label ?? "This card"} failed to render. Try again.`} onRetry={this.reset} />;
    return this.props.children;
  }
}
