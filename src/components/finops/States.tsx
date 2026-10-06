import { Link } from "@tanstack/react-router";
import { Component, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0"><h1 className="font-display text-[30px] font-normal leading-tight tracking-tight">{title}</h1><p className="mt-1 text-[13px] text-muted-foreground">{description}</p></div>
      {actions}
    </div>
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

export function EmptyState({ icon: I, title, action, onAction }: { icon: LucideIcon; title: string; action: string; onAction: () => void }) {
  return (
    <div className="organic-card grid place-items-center gap-3 p-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-secondary"><I className="size-5 text-muted-foreground" /></span>
      <p className="max-w-sm text-sm text-muted-foreground">{title}</p>
      <Button onClick={onAction}>{action}</Button>
    </div>
  );
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
  return <div className="organic-card space-y-3 p-6"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-32" /><Skeleton className={`w-full ${h}`} /></div>;
}

/** Toggle between a chart and an accessible table of the same data. */
export function TableToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" aria-pressed={on} onClick={() => onChange(!on)}>{on ? "View as chart" : "View as table"}</Button>;
}
export function DataTableView({ columns, rows, caption }: { columns: string[]; rows: (string | number)[][]; caption: string }) {
  return (
    <div className="h-full overflow-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-card text-xs text-muted-foreground"><tr>{columns.map((c) => <th key={c} scope="col" className="px-4 py-2 font-medium">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((v, j) => <td key={j} className={`px-4 py-2 ${j ? "metric-numbers" : ""}`}>{v}</td>)}</tr>)}</tbody>
      </table>
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
