// Dismissible getting-started strip on Overview. Step completion is read
// from session-only demo state; only the "dismissed" flag touches localStorage.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Cloud, Rocket, UserPlus, Wallet, X } from "lucide-react";
import { useSession } from "@/lib/session-store";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "fern-onboarding-dismissed";
function readDismissed(): boolean {
  try { return window.localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}
function writeDismissed() {
  try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage unavailable — the strip returns next visit */ }
}

export function OnboardingChecklist() {
  // Read localStorage only after mount so SSR HTML always matches the first client render.
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setDismissed(readDismissed()), []);
  const connected = useSession((s) => Object.values(s.integrations).includes("Connected"));
  const hasBudget = useSession((s) => s.budgets.length > 0);
  const reviewed = useSession((s) => Object.values(s.recs).some((r) => r.status !== "Open"));
  const invited = useSession((s) => (s.settings.members ?? []).some((m) => m.lastActive === "Invited"));
  const steps = [
    { id: "connect", icon: Cloud, label: "Connect a cloud account", short: "Connect cloud", to: "/integrations", done: connected },
    { id: "budget", icon: Wallet, label: "Set a budget", short: "Set a budget", to: "/budgets", done: hasBudget },
    { id: "review", icon: Rocket, label: "Review recommendations", short: "Review tips", to: "/recommendations", done: reviewed },
    { id: "invite", icon: UserPlus, label: "Invite a teammate", short: "Invite teammate", to: "/settings", done: invited },
  ] as const;
  if (dismissed) return null;
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <section aria-label="Getting started" className="organic-card px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}
          className="flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-lg text-left text-[13px]">
          <span className="shrink-0 font-medium text-foreground">Get started with Fern</span>
          <span className="shrink-0 text-muted-foreground">· {doneCount} of {steps.length} done</span>
          <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
        </button>
        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          {steps.map((s) => (
            <span key={s.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${s.done ? "border-primary/30 bg-primary-soft text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
              {s.done && <Check className="size-3" aria-hidden />}{s.short}
            </span>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Dismiss checklist"
          onClick={() => { writeDismissed(); setDismissed(true); }}><X className="size-3.5" /></Button>
      </div>
      {expanded && (
        <ul className="grid gap-2 pb-2 pt-1 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.id}>
              <Link to={s.to} className="flex min-h-10 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-secondary">
                <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${s.done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`} aria-hidden>
                  <Check className="size-3" />
                </span>
                <s.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
