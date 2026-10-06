import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
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
